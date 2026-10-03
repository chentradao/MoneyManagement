/** Finance + attendance Sheets API. Configure IDs and APP_API_TOKEN in Script Properties. */
const CONFIG = {
  timezone: "Asia/Ho_Chi_Minh",
  sheets: { cash:"TienMat", accounts:"TaiKhoan", investments:"DauTu", loans:"ChoVay", companies:"Companies", rates:"Salary_Rates", attendance:"ChamCong_Data" },
  financeIdProperty: "FINANCE_SPREADSHEET_ID",
  attendanceIdProperty: "ATTENDANCE_SPREADSHEET_ID",
  tokenProperty: "APP_API_TOKEN"
};
const FIELDS = {
  cash:{id:["ID"],date:["Ngày"],description:["Mô tả"],amount:["Số tiền (+/-)","Số tiền"],balance:["Số dư"]},
  accounts:{id:["ID"],date:["Ngày"],amount:["Số tiền"],balance:["Số dư"],note:["Ghi chú"]},
  investments:{id:["ID"],type:["Loại đầu tư"],name:["Tên"],principal:["Số vốn"],currentValue:["Giá trị hiện tại"],profitLoss:["Lãi/Lỗ"]},
  loans:{id:["ID"],borrower:["Người vay"],loanDate:["Ngày cho vay"],amount:["Số tiền"],interestRate:["Lãi suất"],dueDate:["Ngày trả"],status:["Trạng thái"],remaining:["Tiền còn"],note:["Ghi chú"]},
  companies:{id:["Company_ID"],name:["Tên công ty"],active:["Đang sử dụng"],note:["Ghi chú"]},
  rates:{id:["Rate_ID","ID"],companyId:["Company_ID"],effectiveFrom:["Từ ngày","Effective_From"],effectiveTo:["Đến ngày","Effective_To"],rate:["Đơn giá/giờ","Salary_Rate"],unit:["Đơn vị","Unit"],note:["Ghi chú","Note"]},
  attendance:{id:["ID"],date:["Ngày"],companyId:["Company_ID"],startTime:["Giờ vào"],endTime:["Giờ ra"],hours:["Số giờ"],status:["Trạng thái"],note:["Lý do/Ghi chú","Ghi chú"],salaryRate:["Đơn giá"],pay:["Tiền công"]}
};
const REQUIRED = {
  cash:["date","description","amount","balance"],accounts:["date","amount","balance","note"],
  investments:["type","name","principal","currentValue","profitLoss"],
  loans:["borrower","loanDate","amount","interestRate","dueDate","status","remaining","note"],
  companies:["id","name","active"],rates:["id","companyId","effectiveFrom","effectiveTo","rate","unit","note"],
  attendance:["id","date","companyId","startTime","endTime","hours","status","note","salaryRate","pay"]
};
function norm(s){return String(s||"").normalize("NFD").replace(/[\u0300-\u036f]/g,"").replace(/[đĐ]/g,"d").toLowerCase().replace(/[^a-z0-9]/g,"");}
function json(data){return ContentService.createTextOutput(JSON.stringify(data)).setMimeType(ContentService.MimeType.JSON);}
function doGet(){return json({ok:true,service:"personal-finance-sheets-api",timezone:CONFIG.timezone});}
function doPost(e){
  const lock=LockService.getScriptLock();
  try{
    const req=JSON.parse(e.postData.contents||"{}"), expected=PropertiesService.getScriptProperties().getProperty(CONFIG.tokenProperty);
    if(expected && req.apiToken!==expected) return json({error:"Không được phép truy cập API."});
    if(!expected) return json({error:"Thiếu Script Property APP_API_TOKEN. Hãy cấu hình bảo mật trước khi dùng."});
    if(["create","update","delete"].includes(req.action)) lock.waitLock(20000);
    const result=dispatch(req); return json(result);
  }catch(err){console.error(err&&err.stack||err);return json({error:err.message||"Lỗi xử lý Google Sheets."});}
  finally{try{lock.releaseLock();}catch(ignore){}}
}
function dispatch(req){
  if(req.action==="getAll") return getAll();
  if(req.action==="getData") return getData(req.resources);
  if(req.action==="dashboard") return dashboard(req.month||Utilities.formatDate(new Date(),CONFIG.timezone,"yyyy-MM"),req.companyId||"");
  const key=String(req.resource||"").replace(/-/g,"");
  const map={cash:"cash",accounts:"accounts",investments:"investments",loans:"loans",companies:"companies",salaryrates:"rates",attendance:"attendance"};
  const resource=map[key]; if(!resource) throw Error("API không hỗ trợ nhóm dữ liệu này.");
  if(req.action==="list") return list(resource);
  if(req.action==="create") return create(resource,req);
  if(req.action==="update") return update(resource,req);
  if(req.action==="delete") return remove(resource,req.id);
  if(req.action==="restore") return restore(resource,req.id);
  throw Error("Thao tác API không hợp lệ.");
}
function workbookFor(resource){
  const p=PropertiesService.getScriptProperties(), finance=["cash","accounts","investments","loans"].includes(resource);
  const id=p.getProperty(finance?CONFIG.financeIdProperty:CONFIG.attendanceIdProperty);
  if(!id) throw Error("Chưa cấu hình "+(finance?CONFIG.financeIdProperty:CONFIG.attendanceIdProperty)+" trong Script Properties.");
  const book=SpreadsheetApp.openById(id), sheetName=CONFIG.sheets[resource], sheet=book.getSheetByName(sheetName);
  if(!sheet) throw Error("Không tìm thấy sheet «"+sheetName+"». Không có sheet nào được tạo hoặc đổi tên.");
  return sheet;
}
function headerMap(sheet,resource){
  const headers=sheet.getRange(1,1,1,sheet.getLastColumn()).getDisplayValues()[0], map={};
  Object.keys(FIELDS[resource]).forEach(k=>{const aliases=FIELDS[resource][k].map(norm);const ix=headers.findIndex(h=>aliases.includes(norm(h)));if(ix>=0)map[k]=ix+1;});
  const missing=REQUIRED[resource].filter(k=>!map[k]);
  if(missing.length) throw Error("Sheet «"+sheet.getName()+"» thiếu header bắt buộc cho: "+missing.join(", ")+". Đã dừng trước khi ghi; hãy kiểm tra tên cột và dùng mapping cấu hình.");
  map._headers=headers;
  return map;
}
function rowId(sheet,row,map,resource,values,occurrence,metadataByRow){
  if(map.id && values[map.id-1]) return String(values[map.id-1]);
  const rowMetadata=metadataByRow[row]||{};
  if(rowMetadata.APP_RECORD_ID)return rowMetadata.APP_RECORD_ID;
  const keys={cash:["date","description","amount"],accounts:["date","amount","note"],investments:["type","name","principal","currentValue"],loans:["borrower","loanDate","amount","interestRate","dueDate","status","note"],companies:["id","name"],rates:["companyId","effectiveFrom","effectiveTo","rate","unit","note"],attendance:["date","companyId","startTime","endTime","status","note"]}[resource];
  const stable=keys.map(k=>{const v=map[k]?values[map[k]-1]:"";return v instanceof Date?Utilities.formatDate(v,CONFIG.timezone,"yyyy-MM-dd'T'HH:mm:ss"):String(v==null?"":v)}).join("|");
  const digest=Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256,resource+"|"+stable);
  return "LEG-"+Utilities.base64EncodeWebSafe(digest).replace(/=/g,"").slice(0,26);
}
function metadataIndex(sheet){
  const byRow=Object.create(null);
  sheet.createDeveloperMetadataFinder().find().forEach(meta=>{
    const rowRange=meta.getLocation().getRow();
    if(!rowRange)return;
    const row=rowRange.getRow(), key=meta.getKey();
    if(key!=="APP_RECORD_ID"&&key!=="APP_SOFT_DELETED")return;
    if(!byRow[row])byRow[row]=Object.create(null);
    byRow[row][key]=meta.getValue()||true;
  });
  return byRow;
}
function records(resource,includeDeleted,skipIds){
  const sheet=workbookFor(resource), map=headerMap(sheet,resource), last=sheet.getLastRow(), result=[], counts={};
  if(last<2)return {sheet,map,headers:map._headers,items:result};
  const lastColumn=sheet.getLastColumn();
  const rows=sheet.getRange(2,1,last-1,lastColumn).getValues();
  const metadataByRow=metadataIndex(sheet);
  rows.forEach((v,i)=>{
    if(v.every(x=>x===""||x===null))return;
    const has=(k)=>map[k]&&v[map[k]-1]!==""&&v[map[k]-1]!==null;
    const valid=resource==="cash"?has("date")&&has("amount"):
      resource==="accounts"?has("date")&&has("amount"):
      resource==="investments"?has("type")||has("name")||has("principal")||has("currentValue"):
      resource==="loans"?has("borrower")||has("amount"):
      resource==="companies"?has("id")&&has("name"):
      resource==="rates"?has("companyId")&&has("effectiveFrom")&&has("rate"):
      has("date")&&has("companyId");
    if(!valid)return;
    const row=i+2, metadata=metadataByRow[row]||{}, deleted=!!metadata.APP_SOFT_DELETED;
    if(deleted&&!includeDeleted)return;
    let id="";
    if(!skipIds){
      const signature=JSON.stringify(v.map(x=>x instanceof Date?x.toISOString():String(x==null?"":x)));
      counts[signature]=(counts[signature]||0)+1;
      id=rowId(sheet,row,map,resource,v,counts[signature],metadataByRow);
    }
    result.push({row,values:v,id,deleted});
  });
  return {sheet,map,headers:map._headers,items:result};
}
function dateOut(v){if(!v)return "";if(v instanceof Date)return Utilities.formatDate(v,CONFIG.timezone,"yyyy-MM-dd");const s=String(v);if(/^\d{4}-\d\d-\d\d/.test(s))return s.slice(0,10);return s;}
function timeOut(v,timezone){if(!v)return "";if(v instanceof Date)return Utilities.formatDate(v,timezone||CONFIG.timezone,"HH:mm");if(typeof v==="number")return Utilities.formatDate(new Date(Math.round(v*86400000)),"UTC","HH:mm");return String(v).slice(0,5);}
function num(v){if(typeof v==="number")return v;if(v===""||v==null)return 0;return Number(String(v).replace(/,/g,""))||0;}
function value(record,map,k){return map[k]?record.values[map[k]-1]:"";}
function objectOf(resource,r){
  const m=r.map,v=r.values, id=r.id, active=value(r,m,"active");
  if(resource==="cash")return{id,date:dateOut(value(r,m,"date")),description:String(value(r,m,"description")||""),amount:num(value(r,m,"amount")),balance:num(value(r,m,"balance"))};
  if(resource==="accounts")return{id,date:dateOut(value(r,m,"date")),amount:num(value(r,m,"amount")),balance:num(value(r,m,"balance")),note:String(value(r,m,"note")||"")};
  if(resource==="investments")return{id,type:String(value(r,m,"type")||""),name:String(value(r,m,"name")||""),principal:num(value(r,m,"principal")),currentValue:num(value(r,m,"currentValue")),profitLoss:num(value(r,m,"profitLoss"))};
  if(resource==="loans"){const amount=num(value(r,m,"amount")),status=String(value(r,m,"status")||"Chưa trả");return{id,borrower:String(value(r,m,"borrower")||""),loanDate:dateOut(value(r,m,"loanDate")),amount,interestRate:num(value(r,m,"interestRate")),dueDate:dateOut(value(r,m,"dueDate")),status,remaining:status==="Đã trả"?0:(m.remaining?num(value(r,m,"remaining")):amount),note:String(value(r,m,"note")||"")};}
  if(resource==="companies")return{id,name:String(value(r,m,"name")||""),active:["Có","Yes","TRUE","1","Đang hoạt động","true"].includes(String(active)),note:String(value(r,m,"note")||"")};
  if(resource==="rates")return{id,companyId:String(value(r,m,"companyId")||""),effectiveFrom:dateOut(value(r,m,"effectiveFrom")),effectiveTo:dateOut(value(r,m,"effectiveTo")),rate:num(value(r,m,"rate")),unit:String(value(r,m,"unit")||""),note:String(value(r,m,"note")||"")};
  const date=dateOut(value(r,m,"date")),companyId=String(value(r,m,"companyId")||""),timezone=r.timezone||CONFIG.timezone,startTime=timeOut(value(r,m,"startTime"),timezone),endTime=timeOut(value(r,m,"endTime"),timezone);
  const hrs=num(value(r,m,"hours")), rate=num(value(r,m,"salaryRate")), payVal=value(r,m,"pay"), status=String(value(r,m,"status")||"");
  const pay=status==="Nghỉ không lương"?0:(payVal!==""&&payVal!=null?num(payVal):hrs*rate);
  return{id,date,companyId,startTime,endTime,hours:hrs,salaryRate:rate,pay,status,note:String(value(r,m,"note")||"")};
}
function list(resource){const r=records(resource);return {items:r.items.map(x=>objectOf(resource,{...x,map:r.map,values:x.values,timezone:r.sheet.getParent().getSpreadsheetTimeZone()})),schema:{sheet:r.sheet.getName(),headers:r.headers||[]}};}
function getAll(){
  const out={};["cash","accounts","investments","loans","companies","rates","attendance"].forEach(k=>out[k]=list(k).items);
  return out;
}
function getData(resources){
  const allowed={cash:true,accounts:true,investments:true,loans:true,companies:true,rates:true,attendance:true};
  const names=Array.isArray(resources)?resources:String(resources||"").split(",").filter(Boolean);
  if(!names.length)throw Error("Chưa chọn nhóm dữ liệu cần tải.");
  const out={};
  names.forEach(name=>{
    if(!allowed[name])throw Error("API không hỗ trợ nhóm dữ liệu này: "+name);
    out[name]=list(name).items;
  });
  return out;
}
function persistId(sheet,row,map,id){if(map.id){sheet.getRange(row,map.id).setValue(id);return;}const range=sheet.getRange(row,1,1,sheet.getLastColumn()),existing=range.getDeveloperMetadata().find(m=>m.getKey()==="APP_RECORD_ID");if(existing)existing.setValue(id);else range.addDeveloperMetadata("APP_RECORD_ID",id,SpreadsheetApp.DeveloperMetadataVisibility.DOCUMENT);}
function newId(prefix){return prefix+"-"+Utilities.getUuid();}
function parseDate(s){if(!/^\d{4}-\d\d-\d\d$/.test(String(s||"")))throw Error("Ngày không hợp lệ. Vui lòng chọn ngày.");const [y,m,d]=s.split("-").map(Number);return new Date(Date.UTC(y,m-1,d,12));}
function salaryAt(companyId,date){
  const all=records("rates"), day=dateOut(date), hits=all.items.map(x=>objectOf("rates",{...x,map:all.map,values:x.values})).filter(x=>x.companyId===companyId&&x.effectiveFrom<=day&&(!x.effectiveTo||x.effectiveTo>=day)).sort((a,b)=>b.effectiveFrom.localeCompare(a.effectiveFrom));
  if(!hits.length)throw Error("Không tìm thấy mức lương có hiệu lực cho công ty và ngày đã chọn.");
  return hits[0];
}
function toMinutes(s){const p=String(s||"").split(":").map(Number);if(p.length!==2||p.some(isNaN))throw Error("Giờ làm không hợp lệ.");return p[0]*60+p[1];}
function validateCompany(id){if(!list("companies").items.some(c=>c.id===id&&c.active))throw Error("Mã công ty không tồn tại hoặc đang ngừng hoạt động.");}
function normalizeInput(resource,req,current){
  const x=Object.assign({},current||{},req), today=Utilities.formatDate(new Date(),CONFIG.timezone,"yyyy-MM-dd");
  if(["cash","accounts"].includes(resource)){
    if(!x.date)throw Error("Vui lòng nhập ngày.");parseDate(x.date);
    const amount=Number(x.amount);if(!Number.isFinite(amount)||amount===0)throw Error("Số tiền phải là số khác 0.");
    x.amount=resource==="cash"?Math.abs(amount)*(x.type==="Chi"?-1:Math.sign(amount)):amount;
    if(resource==="cash"&&!String(x.description||"").trim())throw Error("Vui lòng nhập mô tả giao dịch.");
  }
  if(resource==="investments"){if(!String(x.name||"").trim())throw Error("Vui lòng nhập tên khoản đầu tư.");for(const k of ["principal","currentValue"])if(!Number.isFinite(Number(x[k]))||Number(x[k])<0)throw Error("Số vốn và giá trị hiện tại phải là số không âm.");x.profitLoss=Number(x.currentValue)-Number(x.principal);}
  if(resource==="loans"){if(!String(x.borrower||"").trim())throw Error("Vui lòng nhập người vay.");if(!Number.isFinite(Number(x.amount))||Number(x.amount)<=0)throw Error("Số tiền cho vay phải lớn hơn 0.");x.status=x.status==="Đã trả"?"Đã trả":"Chưa trả";x.remaining=x.status==="Đã trả"?0:Number(x.amount);if(x.loanDate)parseDate(x.loanDate);if(x.dueDate)parseDate(x.dueDate);}
  if(resource==="companies"){if(!String(x.name||"").trim())throw Error("Vui lòng nhập tên công ty.");x.id=x.id||"CT-"+Utilities.getUuid().slice(0,8).toUpperCase();if(list("companies").items.some(c=>c.id===x.id))throw Error("Mã công ty đã tồn tại.");x.active=x.active!==false;}
  if(resource==="rates"){if(!x.companyId)throw Error("Vui lòng chọn công ty.");validateCompany(x.companyId);if(!x.effectiveFrom)throw Error("Vui lòng nhập ngày hiệu lực.");parseDate(x.effectiveFrom);if(x.effectiveTo){parseDate(x.effectiveTo);if(x.effectiveTo<x.effectiveFrom)throw Error("Ngày kết thúc phải sau ngày bắt đầu.");}if(Number(x.rate)<0||!Number.isFinite(Number(x.rate)))throw Error("Mức lương phải là số không âm.");const rateRows=records("rates"),old=rateRows.items.map(r=>objectOf("rates",{...r,map:rateRows.map,values:r.values})).filter(r=>r.companyId===x.companyId&&r.id!==x.id);if(old.some(r=>(!x.effectiveTo||r.effectiveFrom<=x.effectiveTo)&&(!r.effectiveTo||r.effectiveTo>=x.effectiveFrom)))throw Error("Khoảng hiệu lực bị trùng với mức lương đã có của công ty này.");x.id=x.id||"R-"+Utilities.getUuid().slice(0,8).toUpperCase();}
  if(resource==="attendance"){
    if(!x.date)throw Error("Vui lòng nhập ngày làm.");parseDate(x.date);validateCompany(x.companyId);
    const a=toMinutes(x.startTime),b=toMinutes(x.endTime);if(b<=a)throw Error("Giờ kết thúc phải sau giờ bắt đầu; ca qua ngày chưa được hỗ trợ.");
    const hrs=(b-a)/60, existing=records("attendance");if(existing.items.some(r=>r.id!==x.id&&dateOut(r.values[existing.map.date-1])===x.date&&String(r.values[existing.map.companyId-1])===x.companyId))throw Error("Đã có ngày công cho công ty này trong ngày đã chọn.");
    const rate=salaryAt(x.companyId,x.date);x.id=x.id||newId("ATT");x.hours=hrs;x.salaryRate=rate.rate;x.status=x.status||"Đi làm";x.pay=x.status==="Nghỉ không lương"?0:hrs*rate.rate;
  }
  return x;
}
function setFields(sheet,row,map,resource,x,isNew){
  const updates={};
  Object.keys(FIELDS[resource]).forEach(k=>{
    if(!map[k]||x[k]===undefined)return;
    let v=x[k];if(["date","loanDate","dueDate","effectiveFrom","effectiveTo"].includes(k))v=v?parseDate(v):"";
    if(["cash","accounts"].includes(resource)&&k==="balance")return;
    if(resource==="cash"&&k==="amount")v=Number(v);
    updates[map[k]]=v;
  });
  if((resource==="cash"||resource==="accounts")&&map.balance){
    const count=Math.max(0,row-2), firstColumn=Math.min(map.date,map.amount), lastColumn=Math.max(map.date,map.amount);
    let prior=0;
    if(count){
      const rows=sheet.getRange(2,firstColumn,count,lastColumn-firstColumn+1).getValues();
      const dateOffset=map.date-firstColumn, amountOffset=map.amount-firstColumn;
      prior=rows.reduce((sum,values)=>{
        const hasDate=values[dateOffset]!==""&&values[dateOffset]!==null;
        const amount=values[amountOffset];
        return hasDate&&amount!==""&&amount!==null?sum+num(amount):sum;
      },0);
    }
    updates[map.balance]=prior+Number(x.amount);
  }
  if(resource==="investments"&&map.profitLoss)updates[map.profitLoss]=Number(x.currentValue)-Number(x.principal);
  if(resource==="loans"&&map.remaining)updates[map.remaining]=x.status==="Đã trả"?0:Number(x.amount);

  const columns=Object.keys(updates).map(Number).sort((a,b)=>a-b);
  let start=0, group=[];
  columns.forEach(column=>{
    if(group.length&&column!==group[group.length-1]+1){
      sheet.getRange(row,start,1,group.length).setValues([group.map(c=>updates[c])]);
      group=[];
    }
    if(!group.length)start=column;
    group.push(column);
  });
  if(group.length)sheet.getRange(row,start,1,group.length).setValues([group.map(c=>updates[c])]);
}
function create(resource,req){
  const sheet=workbookFor(resource), map=headerMap(sheet,resource), x=normalizeInput(resource,req,null), id=x.id||newId(resource==="attendance"?"ATT":resource.toUpperCase());
  x.id=id;
  const row=Math.max(2,sheet.getLastRow()+1);setFields(sheet,row,map,resource,x,true);
  if(!map.id)persistId(sheet,row,map,id);
  return {item:{...x,id},message:"Đã thêm dữ liệu."};
}
function update(resource,req){
  if(!req.id)throw Error("Thiếu ID bản ghi.");const r=records(resource), hit=r.items.filter(x=>x.id===req.id);if(hit.length!==1)throw Error(hit.length?"Có ID trùng; đã dừng để bảo toàn dữ liệu.":"Không tìm thấy bản ghi cần cập nhật.");
  const current=objectOf(resource,{...hit[0],map:r.map,values:hit[0].values}),x=normalizeInput(resource,req,current),row=hit[0].row;
  setFields(r.sheet,row,r.map,resource,x,false);if(!r.map.id)persistId(r.sheet,row,r.map,req.id);return {item:{...x,id:req.id},message:"Đã cập nhật dữ liệu."};
}
function remove(resource,id){
  if(!id)throw Error("Thiếu ID bản ghi.");const r=records(resource),hits=r.items.filter(x=>x.id===id);
  if(hits.length!==1)throw Error(hits.length?"Có ID trùng; đã dừng để bảo toàn dữ liệu.":"Không tìm thấy bản ghi cần xóa.");
  persistId(r.sheet,hits[0].row,r.map,id);
  r.sheet.getRange(hits[0].row,1,1,r.sheet.getLastColumn()).addDeveloperMetadata("APP_SOFT_DELETED",new Date().toISOString(),SpreadsheetApp.DeveloperMetadataVisibility.DOCUMENT);
  r.sheet.hideRows(hits[0].row);return {message:"Đã chuyển dữ liệu vào thùng rác. Có thể khôi phục bằng API."};
}
function restore(resource,id){
  if(!id)throw Error("Thiếu ID bản ghi.");const r=records(resource,true),hits=r.items.filter(x=>x.id===id&&x.deleted);
  if(hits.length!==1)throw Error(hits.length?"Có ID trùng; đã dừng để bảo toàn dữ liệu.":"Không tìm thấy dữ liệu đã xóa.");
  const row=hits[0].row,meta=r.sheet.getRange(row,1,1,r.sheet.getLastColumn()).getDeveloperMetadata().find(m=>m.getKey()==="APP_SOFT_DELETED");
  if(meta)meta.remove();r.sheet.showRows(row);return {message:"Đã khôi phục dữ liệu."};
}
function dashboard(month,companyId){
  const prefix=month+"-", daily={},byDay={},byMonth={};
  const cashRows=records("cash",false,true), accountRows=records("accounts",false,true), investmentRows=records("investments",false,true), loanRows=records("loans",false,true);
  const attendanceRows=records("attendance",false,true), companyRows=records("companies",false,true);
  const sumField=(r,k)=>r.items.reduce((sum,item)=>sum+num(value(item,r.map,k)),0);
  const cash=sumField(cashRows,"amount"), accounts=sumField(accountRows,"amount"), investments=sumField(investmentRows,"currentValue"), loans=loanRows.items.reduce((sum,item)=>sum+objectOf("loans",{...item,map:loanRows.map,values:item.values}).remaining,0);
  [cashRows,accountRows].forEach(r=>r.items.forEach(item=>{
    const date=dateOut(value(item,r.map,"date"));
    if(!date||!date.startsWith(prefix))return;
    const amount=num(value(item,r.map,"amount"));
    if(!daily[date])daily[date]={date,income:0,expense:0};
    if(amount>=0)daily[date].income+=amount;else daily[date].expense+=Math.abs(amount);
  }));
  let days=0,hours=0,pay=0;
  attendanceRows.items.forEach(item=>{
    const date=dateOut(value(item,attendanceRows.map,"date")), company=String(value(item,attendanceRows.map,"companyId")||"");
    if(!date)return;
    const row={...item,map:attendanceRows.map,values:item.values,timezone:attendanceRows.sheet.getParent().getSpreadsheetTimeZone()}, record=objectOf("attendance",row);
    if(!companyId||company===companyId)byMonth[date.slice(0,7)]=(byMonth[date.slice(0,7)]||0)+record.pay;
    if(!date.startsWith(prefix)||companyId&&company!==companyId)return;
    days++;hours+=record.hours;pay+=record.pay;byDay[date]=(byDay[date]||0)+record.hours;
  });
  const companies=companyRows.items.map(item=>objectOf("companies",{...item,map:companyRows.map,values:item.values})).filter(item=>item.active).map(item=>item.id);
  return {finance:{cash,accounts,investments,loans,assets:cash+accounts+investments+loans,daily:Object.values(daily)},attendance:{days,hours,pay,companies,daily:Object.keys(byDay).map(date=>({date,hours:byDay[date]})),monthly:Object.keys(byMonth).sort().slice(-12).map(month=>({month,pay:byMonth[month]}))}};
}
