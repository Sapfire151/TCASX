"""
TCASX Backend API — serves activity data from camp_parser + BeautifulSoup.
Run: python api.py
"""
import os, sys, json, time, threading, concurrent.futures, hashlib, re
from datetime import datetime
from flask import Flask, jsonify, request
from flask_cors import CORS
import httpx as http_req
from bs4 import BeautifulSoup
import concurrent.futures

try:
    from camp_parser import camphub_parser
    HAS_CP = True
except ImportError:
    HAS_CP = False

app = Flask(__name__)
CORS(app)

CACHE = {}
CACHE_TTL = 3600

def cached(k):
    e = CACHE.get(k)
    return e["d"] if e and time.time()-e["t"] < CACHE_TTL else None

def cache_set(k, d):
    CACHE[k] = {"d": d, "t": time.time()}

THAI_MONTHS = {
    'มกราคม':1,'กุมภาพันธ์':2,'มีนาคม':3,'เมษายน':4,
    'พฤษภาคม':5,'มิถุนายน':6,'กรกฎาคม':7,'สิงหาคม':8,
    'กันยายน':9,'ตุลาคม':10,'พฤศจิกายน':11,'ธันวาคม':12
}
MTH = {1:'ม.ค.',2:'ก.พ.',3:'มี.ค.',4:'เม.ย.',5:'พ.ค.',6:'มิ.ย.',7:'ก.ค.',8:'ส.ค.',9:'ก.ย.',10:'ต.ค.',11:'พ.ย.',12:'ธ.ค.'}
MEN = {1:'Jan',2:'Feb',3:'Mar',4:'Apr',5:'May',6:'Jun',7:'Jul',8:'Aug',9:'Sep',10:'Oct',11:'Nov',12:'Dec'}

def ex_month(t):
    if not isinstance(t,str): return datetime.now().month
    for m,v in THAI_MONTHS.items():
        if m in t: return v
    return datetime.now().month

def ex_num(t):
    if not isinstance(t,str): return 50
    n = re.findall(r'\d+', t.replace(',',''))
    return int(n[0]) if n else 50

CATS = {
    'computer':{'type':'academic','th':'วิชาการ','en':'Academic'},
    'science':{'type':'academic','th':'วิชาการ','en':'Academic'},
    'engineer':{'type':'academic','th':'วิชาการ','en':'Academic'},
    'medical-health/doctor':{'type':'academic','th':'วิชาการ','en':'Academic'},
    'volunteer':{'type':'volunteer','th':'จิตอาสา','en':'Volunteer'},
    'lang-human':{'type':'language','th':'ภาษา','en':'Language'},
    'political':{'type':'leadership','th':'ผู้นำ','en':'Leadership'},
    'commarts':{'type':'sport_art','th':'ศิลปะ','en':'Art & Design'},
}
COLORS = {'academic':'#3B2FCC','volunteer':'#10B981','language':'#F59E0B','leadership':'#EC4899','sport_art':'#8B5CF6'}
UA = {'User-Agent':'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'}

def fetch_cat(slug):
    ci = CATS.get(slug, {'type':'academic','th':'วิชาการ','en':'Academic'})
    url = f'https://www.camphub.in.th/{slug}'
    try:
        r = http_req.get(url, headers=UA, timeout=15, follow_redirects=True)
        r.encoding = 'utf-8'
        soup = BeautifulSoup(r.text, 'html.parser')
        arts = soup.find_all('article')
        res = []
        current_date = datetime.now()
        current_year = current_date.year
        
        for a in arts:
            tt = a.find(['h2','h3','h4'])
            title = tt.text.strip() if tt else "Unknown"
            lt = a.find('a')
            link = lt['href'] if lt and lt.get('href') else ""
            img = a.find('img')
            image = img.get('src','') if img else ''
            dl_str, spots = "", 50
            is_outdated = False
            
            if link and not os.environ.get("VERCEL"):
                try:
                    dr = http_req.get(link, headers=UA, timeout=10)
                    ds = BeautifulSoup(dr.content, 'html.parser')
                    tx = ds.get_text()
                    
                    # Check for outdated indicators
                    if any(indicator in tx for indicator in ["ปิดรับสมัคร", "หมดเวลา", "สิ้นสุดการรับสมัคร", "ผ่านไปแล้ว"]):
                        is_outdated = True
                    
                    # Check for year indicators to filter old activities
                    year_match = re.search(r'(20\d{2})', tx)
                    if year_match:
                        activity_year = int(year_match.group(1))
                        if activity_year < current_year - 1:  # Filter out activities older than last year
                            is_outdated = True
                    
                    if "ปิดรับสมัคร" in tx:
                        i = tx.find("ปิดรับสมัคร")
                        dl_str = tx[i:i+40].replace('\n',' ').strip()
                    if "จำนวนที่รับ" in tx:
                        i = tx.find("จำนวนที่รับ")
                        spots = ex_num(tx[i:i+30])
                except: pass
            
            # Skip outdated activities
            if is_outdated:
                continue
                
            mo = ex_month(dl_str)
            dl_c = dl_str.split('(')[0].strip() if '(' in dl_str else dl_str.strip()
            if len(dl_c)>35: dl_c = dl_c[:32]+'...'
            res.append({
                "name":title,"name_en":title,"type":ci['type'],
                "type_th":ci['th'],"type_en":ci['en'],"category_slug":slug,
                "level":"national","level_th":"ระดับประเทศ","level_en":"National",
                "month":mo,"month_th":MTH.get(mo,''),"month_en":MEN.get(mo,''),
                "deadline":dl_c or "ไม่ระบุ","spots":spots,"cert":"ระดับประเทศ",
                "link":link,"image":image,"color":COLORS.get(ci['type'],'#3B2FCC'),
            })
        return res
    except Exception as e:
        print(f"[ERR] {slug}: {e}")
        return []

def fetch_all():
    c = cached("all")
    if c: return c
    items, idx = [], 1
    
    with concurrent.futures.ThreadPoolExecutor(max_workers=8) as executor:
        future_to_slug = {executor.submit(fetch_cat, slug): slug for slug in CATS}
        for future in concurrent.futures.as_completed(future_to_slug):
            slug = future_to_slug[future]
            try:
                for it in future.result():
                    it["id"] = idx
                    idx += 1
                    items.append(it)
            except Exception as e:
                print(f"[ERR] {slug} generated an exception: {e}")
                
    cache_set("all", items)
    return items

MYTCAS_API_BASE = "https://my-tcas.s3.ap-southeast-1.amazonaws.com/mytcas"

def build_default_reqs(program_name, group_field_th="", field_name_th="", program_type_name_th="", major_acceptance_number=None):
    # Base profile, then specialize by official TCAS taxonomy fields.
    req = {
        "academic":{"min":2,"th":"วิชาการ","en":"Academic"},
        "volunteer":{"min":1,"th":"จิตอาสา","en":"Volunteer"},
        "leadership":{"min":1,"th":"ผู้นำ","en":"Leadership"},
        "sport_art":{"min":0,"th":"กีฬา/ศิลปะ","en":"Sports/Art"},
        "language":{"min":1,"th":"ภาษา","en":"Language"},
    }

    haystack = " ".join([
        str(program_name or ""),
        str(group_field_th or ""),
        str(field_name_th or ""),
        str(program_type_name_th or "")
    ]).lower()

    # Health sciences
    if any(k in haystack for k in ["แพทย", "ทันต", "เภสัช", "พยาบาล", "สาธารณสุข", "เทคนิคการแพทย์", "สัตวแพทย"]):
        req["academic"]["min"] = 3
        req["volunteer"]["min"] = 2
        req["leadership"]["min"] = max(req["leadership"]["min"], 1)

    # Engineering + IT/Computer/Tech
    elif any(k in haystack for k in ["วิศว", "วิทยาการคอม", "คอมพิวเตอร์", "เทคโนโลยีสารสนเทศ", "ไอที", "ดิจิทัล", "ข้อมูล"]):
        req["academic"]["min"] = 3
        req["language"]["min"] = max(req["language"]["min"], 1)
        req["leadership"]["min"] = max(req["leadership"]["min"], 1)

    # Business / Law / Political / Economics / Social science
    elif any(k in haystack for k in ["นิติ", "รัฐศาสตร์", "บริหาร", "บัญชี", "เศรษฐ", "รัฐประศาสน", "สังคม"]):
        req["academic"]["min"] = max(req["academic"]["min"], 2)
        req["leadership"]["min"] = 2
        req["language"]["min"] = max(req["language"]["min"], 1)

    # Language / humanities / arts
    elif any(k in haystack for k in ["ภาษา", "อักษร", "มนุษย", "ศิลปศาสตร์", "นิเทศ", "วารสาร"]):
        req["language"]["min"] = 3
        req["academic"]["min"] = max(req["academic"]["min"], 1)
        req["volunteer"]["min"] = max(req["volunteer"]["min"], 1)

    # Fine arts / design / architecture / music
    if any(k in haystack for k in ["ศิลป", "ดนตรี", "ออกแบบ", "สถาปัต", "นาฏ", "แฟชั่น"]):
        req["sport_art"]["min"] = max(req["sport_art"]["min"], 2)
        req["academic"]["min"] = max(req["academic"]["min"], 1)

    # Education majors tend to value service and leadership
    if any(k in haystack for k in ["ครุ", "ศึกษา", "พลศึกษา", "สุขศึกษา"]):
        req["volunteer"]["min"] = max(req["volunteer"]["min"], 2)
        req["leadership"]["min"] = max(req["leadership"]["min"], 2)

    # Competitiveness booster based on intake size.
    # Smaller intake -> harder competition -> nudge academic requirement up.
    try:
        seats = int(major_acceptance_number) if major_acceptance_number not in (None, "") else None
    except Exception:
        seats = None
    if seats is not None:
        if seats <= 30:
            req["academic"]["min"] = min(4, req["academic"]["min"] + 1)
        elif seats <= 80:
            req["academic"]["min"] = min(4, req["academic"]["min"] + 0)

    return req

def fetch_mytcas_faculties():
    c = cached("mytcas_faculties")
    if c:
        return c
    try:
        r = http_req.get(f"{MYTCAS_API_BASE}/courses.json", headers=UA, timeout=30)
        r.raise_for_status()
        rows = r.json()
        faculties = []
        seen = set()
        for row in rows:
            uid = str(row.get("_id") or "").strip()
            uni_th = (row.get("university_name_th") or "").strip()
            if not uid or not uni_th:
                continue
            program_name = (row.get("program_name_th") or row.get("major_name_th") or row.get("course_name_th") or row.get("faculty_name_th") or "").strip()
            faculty_name = (row.get("faculty_name_th") or program_name or "").strip()
            if not program_name:
                continue
            fid = f"tcas_{uid}"
            if fid in seen:
                continue
            seen.add(fid)
            faculties.append({
                "id": fid,
                "uni_th": uni_th,
                "uni_en": (row.get("university_name_en") or "").strip(),
                "fac_th": program_name,
                "fac_en": (row.get("program_name_en") or row.get("faculty_name_en") or "").strip(),
                "faculty_group_th": faculty_name,
                "group_field_th": (row.get("group_field_th") or "").strip(),
                "field_name_th": (row.get("field_name_th") or "").strip(),
                "campus_th": (row.get("campus_name_th") or "").strip(),
                "major_acceptance_number": row.get("major_acceptance_number"),
                "source": "mytcas",
                "reqs": build_default_reqs(
                    program_name=program_name,
                    group_field_th=row.get("group_field_th"),
                    field_name_th=row.get("field_name_th"),
                    program_type_name_th=row.get("program_type_name_th"),
                    major_acceptance_number=row.get("major_acceptance_number"),
                ),
            })
        faculties.sort(key=lambda x: (x["uni_th"], x["fac_th"]))
        cache_set("mytcas_faculties", faculties)
        return faculties
    except Exception as e:
        print(f"[WARN] mytcas fetch failed: {e}")
        return []

def get_faculties_dataset():
    dynamic = fetch_mytcas_faculties()
    return dynamic if dynamic else FACULTIES

FACULTIES = [
    # === จุฬาลงกรณ์มหาวิทยาลัย ===
    {"id":"eng_cu","uni_th":"จุฬาลงกรณ์มหาวิทยาลัย","uni_en":"Chulalongkorn","fac_th":"คณะวิศวกรรมศาสตร์","fac_en":"Engineering",
     "reqs":{"academic":{"min":3,"th":"วิชาการ","en":"Academic"},"volunteer":{"min":1,"th":"จิตอาสา","en":"Volunteer"},"leadership":{"min":1,"th":"ผู้นำ","en":"Leadership"},"language":{"min":1,"th":"ภาษา","en":"Language"}}},
    {"id":"med_cu","uni_th":"จุฬาลงกรณ์มหาวิทยาลัย","uni_en":"Chulalongkorn","fac_th":"คณะแพทยศาสตร์","fac_en":"Medicine",
     "reqs":{"academic":{"min":3,"th":"วิชาการ","en":"Academic"},"volunteer":{"min":2,"th":"จิตอาสา","en":"Volunteer"},"leadership":{"min":1,"th":"ผู้นำ","en":"Leadership"},"language":{"min":1,"th":"ภาษา","en":"Language"}}},
    {"id":"sci_cu","uni_th":"จุฬาลงกรณ์มหาวิทยาลัย","uni_en":"Chulalongkorn","fac_th":"คณะวิทยาศาสตร์","fac_en":"Science",
     "reqs":{"academic":{"min":3,"th":"วิชาการ","en":"Academic"},"volunteer":{"min":1,"th":"จิตอาสา","en":"Volunteer"},"language":{"min":1,"th":"ภาษา","en":"Language"}}},
    {"id":"arts_cu","uni_th":"จุฬาลงกรณ์มหาวิทยาลัย","uni_en":"Chulalongkorn","fac_th":"คณะอักษรศาสตร์","fac_en":"Arts",
     "reqs":{"language":{"min":3,"th":"ภาษา","en":"Language"},"academic":{"min":1,"th":"วิชาการ","en":"Academic"},"volunteer":{"min":1,"th":"จิตอาสา","en":"Volunteer"}}},
    {"id":"acc_cu","uni_th":"จุฬาลงกรณ์มหาวิทยาลัย","uni_en":"Chulalongkorn","fac_th":"คณะพาณิชยศาสตร์และการบัญชี","fac_en":"Commerce & Accountancy",
     "reqs":{"academic":{"min":2,"th":"วิชาการ","en":"Academic"},"leadership":{"min":2,"th":"ผู้นำ","en":"Leadership"},"language":{"min":1,"th":"ภาษา","en":"Language"}}},
    {"id":"arch_cu","uni_th":"จุฬาลงกรณ์มหาวิทยาลัย","uni_en":"Chulalongkorn","fac_th":"คณะสถาปัตยกรรมศาสตร์","fac_en":"Architecture",
     "reqs":{"academic":{"min":1,"th":"วิชาการ","en":"Academic"},"sport_art":{"min":3,"th":"ศิลปะ","en":"Art"},"volunteer":{"min":1,"th":"จิตอาสา","en":"Volunteer"}}},
    {"id":"comm_cu","uni_th":"จุฬาลงกรณ์มหาวิทยาลัย","uni_en":"Chulalongkorn","fac_th":"คณะนิเทศศาสตร์","fac_en":"Communication Arts",
     "reqs":{"sport_art":{"min":2,"th":"ศิลปะ","en":"Art"},"language":{"min":2,"th":"ภาษา","en":"Language"},"volunteer":{"min":1,"th":"จิตอาสา","en":"Volunteer"}}},
    {"id":"edu_cu","uni_th":"จุฬาลงกรณ์มหาวิทยาลัย","uni_en":"Chulalongkorn","fac_th":"คณะครุศาสตร์","fac_en":"Education",
     "reqs":{"volunteer":{"min":2,"th":"จิตอาสา","en":"Volunteer"},"leadership":{"min":2,"th":"ผู้นำ","en":"Leadership"},"academic":{"min":1,"th":"วิชาการ","en":"Academic"}}},
    {"id":"law_cu","uni_th":"จุฬาลงกรณ์มหาวิทยาลัย","uni_en":"Chulalongkorn","fac_th":"คณะนิติศาสตร์","fac_en":"Law",
     "reqs":{"academic":{"min":2,"th":"วิชาการ","en":"Academic"},"leadership":{"min":2,"th":"ผู้นำ","en":"Leadership"},"language":{"min":1,"th":"ภาษา","en":"Language"}}},
    {"id":"polsci_cu","uni_th":"จุฬาลงกรณ์มหาวิทยาลัย","uni_en":"Chulalongkorn","fac_th":"คณะรัฐศาสตร์","fac_en":"Political Science",
     "reqs":{"leadership":{"min":2,"th":"ผู้นำ","en":"Leadership"},"volunteer":{"min":2,"th":"จิตอาสา","en":"Volunteer"},"language":{"min":1,"th":"ภาษา","en":"Language"}}},

    # === มหาวิทยาลัยธรรมศาสตร์ ===
    {"id":"eng_tu","uni_th":"มหาวิทยาลัยธรรมศาสตร์","uni_en":"Thammasat","fac_th":"คณะวิศวกรรมศาสตร์","fac_en":"Engineering",
     "reqs":{"academic":{"min":2,"th":"วิชาการ","en":"Academic"},"volunteer":{"min":1,"th":"จิตอาสา","en":"Volunteer"},"sport_art":{"min":1,"th":"กีฬา/ศิลปะ","en":"Sports/Art"}}},
    {"id":"law_tu","uni_th":"มหาวิทยาลัยธรรมศาสตร์","uni_en":"Thammasat","fac_th":"คณะนิติศาสตร์","fac_en":"Law",
     "reqs":{"academic":{"min":2,"th":"วิชาการ","en":"Academic"},"leadership":{"min":2,"th":"ผู้นำ","en":"Leadership"},"language":{"min":1,"th":"ภาษา","en":"Language"}}},
    {"id":"polsci_tu","uni_th":"มหาวิทยาลัยธรรมศาสตร์","uni_en":"Thammasat","fac_th":"คณะรัฐศาสตร์","fac_en":"Political Science",
     "reqs":{"leadership":{"min":2,"th":"ผู้นำ","en":"Leadership"},"volunteer":{"min":2,"th":"จิตอาสา","en":"Volunteer"},"language":{"min":1,"th":"ภาษา","en":"Language"}}},
    {"id":"econ_tu","uni_th":"มหาวิทยาลัยธรรมศาสตร์","uni_en":"Thammasat","fac_th":"คณะเศรษฐศาสตร์","fac_en":"Economics",
     "reqs":{"academic":{"min":2,"th":"วิชาการ","en":"Academic"},"leadership":{"min":1,"th":"ผู้นำ","en":"Leadership"},"language":{"min":2,"th":"ภาษา","en":"Language"}}},
    {"id":"comm_tu","uni_th":"มหาวิทยาลัยธรรมศาสตร์","uni_en":"Thammasat","fac_th":"คณะวารสารศาสตร์และสื่อสารมวลชน","fac_en":"Journalism",
     "reqs":{"sport_art":{"min":2,"th":"ศิลปะ","en":"Art"},"language":{"min":2,"th":"ภาษา","en":"Language"},"volunteer":{"min":1,"th":"จิตอาสา","en":"Volunteer"}}},
    {"id":"arts_tu","uni_th":"มหาวิทยาลัยธรรมศาสตร์","uni_en":"Thammasat","fac_th":"คณะศิลปศาสตร์","fac_en":"Liberal Arts",
     "reqs":{"language":{"min":3,"th":"ภาษา","en":"Language"},"volunteer":{"min":1,"th":"จิตอาสา","en":"Volunteer"}}},
    {"id":"socadmin_tu","uni_th":"มหาวิทยาลัยธรรมศาสตร์","uni_en":"Thammasat","fac_th":"คณะสังคมสงเคราะห์ศาสตร์","fac_en":"Social Administration",
     "reqs":{"volunteer":{"min":3,"th":"จิตอาสา","en":"Volunteer"},"leadership":{"min":1,"th":"ผู้นำ","en":"Leadership"}}},
    {"id":"acc_tu","uni_th":"มหาวิทยาลัยธรรมศาสตร์","uni_en":"Thammasat","fac_th":"คณะพาณิชยศาสตร์และการบัญชี","fac_en":"Commerce & Accountancy",
     "reqs":{"academic":{"min":2,"th":"วิชาการ","en":"Academic"},"leadership":{"min":2,"th":"ผู้นำ","en":"Leadership"},"language":{"min":1,"th":"ภาษา","en":"Language"}}},

    # === มหาวิทยาลัยมหิดล ===
    {"id":"med_mu","uni_th":"มหาวิทยาลัยมหิดล","uni_en":"Mahidol","fac_th":"คณะแพทยศาสตร์ศิริราช/รามา","fac_en":"Medicine",
     "reqs":{"academic":{"min":3,"th":"วิชาการ","en":"Academic"},"volunteer":{"min":2,"th":"จิตอาสา","en":"Volunteer"},"leadership":{"min":1,"th":"ผู้นำ","en":"Leadership"}}},
    {"id":"sci_mu","uni_th":"มหาวิทยาลัยมหิดล","uni_en":"Mahidol","fac_th":"คณะวิทยาศาสตร์","fac_en":"Science",
     "reqs":{"academic":{"min":3,"th":"วิชาการ","en":"Academic"},"volunteer":{"min":1,"th":"จิตอาสา","en":"Volunteer"},"language":{"min":1,"th":"ภาษา","en":"Language"}}},
    {"id":"ict_mu","uni_th":"มหาวิทยาลัยมหิดล","uni_en":"Mahidol","fac_th":"คณะ ICT","fac_en":"ICT",
     "reqs":{"academic":{"min":2,"th":"วิชาการ","en":"Academic"},"sport_art":{"min":1,"th":"ศิลปะ","en":"Art"},"language":{"min":1,"th":"ภาษา","en":"Language"}}},
    {"id":"nurse_mu","uni_th":"มหาวิทยาลัยมหิดล","uni_en":"Mahidol","fac_th":"คณะพยาบาลศาสตร์","fac_en":"Nursing",
     "reqs":{"academic":{"min":2,"th":"วิชาการ","en":"Academic"},"volunteer":{"min":3,"th":"จิตอาสา","en":"Volunteer"}}},
    {"id":"dent_mu","uni_th":"มหาวิทยาลัยมหิดล","uni_en":"Mahidol","fac_th":"คณะทันตแพทยศาสตร์","fac_en":"Dentistry",
     "reqs":{"academic":{"min":3,"th":"วิชาการ","en":"Academic"},"volunteer":{"min":2,"th":"จิตอาสา","en":"Volunteer"},"sport_art":{"min":1,"th":"ศิลปะ/ทำมือ","en":"Art/Crafts"}}},
    {"id":"pharm_mu","uni_th":"มหาวิทยาลัยมหิดล","uni_en":"Mahidol","fac_th":"คณะเภสัชศาสตร์","fac_en":"Pharmacy",
     "reqs":{"academic":{"min":3,"th":"วิชาการ","en":"Academic"},"volunteer":{"min":1,"th":"จิตอาสา","en":"Volunteer"}}},
    {"id":"arts_mu","uni_th":"มหาวิทยาลัยมหิดล","uni_en":"Mahidol","fac_th":"คณะศิลปศาสตร์","fac_en":"Liberal Arts",
     "reqs":{"language":{"min":3,"th":"ภาษา","en":"Language"},"volunteer":{"min":1,"th":"จิตอาสา","en":"Volunteer"}}},

    # === สจล. (KMITL) ===
    {"id":"eng_kmitl","uni_th":"สถาบันเทคโนโลยีพระจอมเกล้าเจ้าคุณทหารลาดกระบัง","uni_en":"KMITL","fac_th":"คณะวิศวกรรมศาสตร์","fac_en":"Engineering",
     "reqs":{"academic":{"min":3,"th":"วิชาการ","en":"Academic"},"volunteer":{"min":1,"th":"จิตอาสา","en":"Volunteer"}}},
    {"id":"cs_kmitl","uni_th":"สถาบันเทคโนโลยีพระจอมเกล้าเจ้าคุณทหารลาดกระบัง","uni_en":"KMITL","fac_th":"คณะเทคโนโลยีสารสนเทศ","fac_en":"IT",
     "reqs":{"academic":{"min":2,"th":"วิชาการ","en":"Academic"},"volunteer":{"min":1,"th":"จิตอาสา","en":"Volunteer"}}},
    {"id":"arch_kmitl","uni_th":"สถาบันเทคโนโลยีพระจอมเกล้าเจ้าคุณทหารลาดกระบัง","uni_en":"KMITL","fac_th":"คณะสถาปัตยกรรมศาสตร์","fac_en":"Architecture",
     "reqs":{"sport_art":{"min":3,"th":"ศิลปะ","en":"Art"},"academic":{"min":1,"th":"วิชาการ","en":"Academic"}}},
    {"id":"bus_kmitl","uni_th":"สถาบันเทคโนโลยีพระจอมเกล้าเจ้าคุณทหารลาดกระบัง","uni_en":"KMITL","fac_th":"คณะบริหารธุรกิจ","fac_en":"Business",
     "reqs":{"academic":{"min":1,"th":"วิชาการ","en":"Academic"},"leadership":{"min":2,"th":"ผู้นำ","en":"Leadership"},"language":{"min":1,"th":"ภาษา","en":"Language"}}},

    # === มก. (Kasetsart) ===
    {"id":"eng_ku","uni_th":"มหาวิทยาลัยเกษตรศาสตร์","uni_en":"Kasetsart","fac_th":"คณะวิศวกรรมศาสตร์","fac_en":"Engineering",
     "reqs":{"academic":{"min":2,"th":"วิชาการ","en":"Academic"},"volunteer":{"min":1,"th":"จิตอาสา","en":"Volunteer"},"leadership":{"min":1,"th":"ผู้นำ","en":"Leadership"}}},
    {"id":"sci_ku","uni_th":"มหาวิทยาลัยเกษตรศาสตร์","uni_en":"Kasetsart","fac_th":"คณะวิทยาศาสตร์","fac_en":"Science",
     "reqs":{"academic":{"min":2,"th":"วิชาการ","en":"Academic"},"volunteer":{"min":1,"th":"จิตอาสา","en":"Volunteer"}}},
    {"id":"agri_ku","uni_th":"มหาวิทยาลัยเกษตรศาสตร์","uni_en":"Kasetsart","fac_th":"คณะเกษตร","fac_en":"Agriculture",
     "reqs":{"academic":{"min":2,"th":"วิชาการ","en":"Academic"},"volunteer":{"min":2,"th":"จิตอาสา","en":"Volunteer"}}},
    {"id":"bus_ku","uni_th":"มหาวิทยาลัยเกษตรศาสตร์","uni_en":"Kasetsart","fac_th":"คณะบริหารธุรกิจ","fac_en":"Business Administration",
     "reqs":{"academic":{"min":1,"th":"วิชาการ","en":"Academic"},"leadership":{"min":2,"th":"ผู้นำ","en":"Leadership"}}},
    {"id":"hum_ku","uni_th":"มหาวิทยาลัยเกษตรศาสตร์","uni_en":"Kasetsart","fac_th":"คณะมนุษยศาสตร์","fac_en":"Humanities",
     "reqs":{"language":{"min":2,"th":"ภาษา","en":"Language"},"volunteer":{"min":1,"th":"จิตอาสา","en":"Volunteer"}}},
    {"id":"vet_ku","uni_th":"มหาวิทยาลัยเกษตรศาสตร์","uni_en":"Kasetsart","fac_th":"คณะสัตวแพทยศาสตร์","fac_en":"Veterinary Medicine",
     "reqs":{"academic":{"min":3,"th":"วิชาการ","en":"Academic"},"volunteer":{"min":2,"th":"จิตอาสา","en":"Volunteer"}}},

    # === มจธ. (KMUTT) ===
    {"id":"eng_kmutt","uni_th":"มหาวิทยาลัยเทคโนโลยีพระจอมเกล้าธนบุรี","uni_en":"KMUTT","fac_th":"คณะวิศวกรรมศาสตร์","fac_en":"Engineering",
     "reqs":{"academic":{"min":3,"th":"วิชาการ","en":"Academic"},"leadership":{"min":1,"th":"ผู้นำ","en":"Leadership"}}},
    {"id":"sci_kmutt","uni_th":"มหาวิทยาลัยเทคโนโลยีพระจอมเกล้าธนบุรี","uni_en":"KMUTT","fac_th":"คณะวิทยาศาสตร์","fac_en":"Science",
     "reqs":{"academic":{"min":2,"th":"วิชาการ","en":"Academic"},"volunteer":{"min":1,"th":"จิตอาสา","en":"Volunteer"}}},
    {"id":"it_kmutt","uni_th":"มหาวิทยาลัยเทคโนโลยีพระจอมเกล้าธนบุรี","uni_en":"KMUTT","fac_th":"คณะเทคโนโลยีสารสนเทศ","fac_en":"IT",
     "reqs":{"academic":{"min":2,"th":"วิชาการ","en":"Academic"},"sport_art":{"min":1,"th":"ศิลปะ","en":"Art"}}},
    {"id":"arch_kmutt","uni_th":"มหาวิทยาลัยเทคโนโลยีพระจอมเกล้าธนบุรี","uni_en":"KMUTT","fac_th":"คณะสถาปัตยกรรมและการออกแบบ","fac_en":"Architecture & Design",
     "reqs":{"sport_art":{"min":3,"th":"ศิลปะ","en":"Art"},"academic":{"min":1,"th":"วิชาการ","en":"Academic"}}},

    # === มช. (Chiang Mai) ===
    {"id":"eng_cmu","uni_th":"มหาวิทยาลัยเชียงใหม่","uni_en":"Chiang Mai","fac_th":"คณะวิศวกรรมศาสตร์","fac_en":"Engineering",
     "reqs":{"academic":{"min":2,"th":"วิชาการ","en":"Academic"},"volunteer":{"min":1,"th":"จิตอาสา","en":"Volunteer"}}},
    {"id":"med_cmu","uni_th":"มหาวิทยาลัยเชียงใหม่","uni_en":"Chiang Mai","fac_th":"คณะแพทยศาสตร์","fac_en":"Medicine",
     "reqs":{"academic":{"min":3,"th":"วิชาการ","en":"Academic"},"volunteer":{"min":2,"th":"จิตอาสา","en":"Volunteer"},"leadership":{"min":1,"th":"ผู้นำ","en":"Leadership"}}},
    {"id":"masscomm_cmu","uni_th":"มหาวิทยาลัยเชียงใหม่","uni_en":"Chiang Mai","fac_th":"คณะการสื่อสารมวลชน","fac_en":"Mass Communication",
     "reqs":{"sport_art":{"min":2,"th":"ศิลปะ","en":"Art"},"language":{"min":2,"th":"ภาษา","en":"Language"}}},
    {"id":"arts_cmu","uni_th":"มหาวิทยาลัยเชียงใหม่","uni_en":"Chiang Mai","fac_th":"คณะมนุษยศาสตร์","fac_en":"Humanities",
     "reqs":{"language":{"min":3,"th":"ภาษา","en":"Language"},"volunteer":{"min":1,"th":"จิตอาสา","en":"Volunteer"}}},
    {"id":"edu_cmu","uni_th":"มหาวิทยาลัยเชียงใหม่","uni_en":"Chiang Mai","fac_th":"คณะศึกษาศาสตร์","fac_en":"Education",
     "reqs":{"volunteer":{"min":2,"th":"จิตอาสา","en":"Volunteer"},"leadership":{"min":1,"th":"ผู้นำ","en":"Leadership"}}},
    {"id":"nurs_cmu","uni_th":"มหาวิทยาลัยเชียงใหม่","uni_en":"Chiang Mai","fac_th":"คณะพยาบาลศาสตร์","fac_en":"Nursing",
     "reqs":{"academic":{"min":2,"th":"วิชาการ","en":"Academic"},"volunteer":{"min":3,"th":"จิตอาสา","en":"Volunteer"}}},

    # === มข. (Khon Kaen) ===
    {"id":"eng_kku","uni_th":"มหาวิทยาลัยขอนแก่น","uni_en":"Khon Kaen","fac_th":"คณะวิศวกรรมศาสตร์","fac_en":"Engineering",
     "reqs":{"academic":{"min":2,"th":"วิชาการ","en":"Academic"},"volunteer":{"min":1,"th":"จิตอาสา","en":"Volunteer"}}},
    {"id":"med_kku","uni_th":"มหาวิทยาลัยขอนแก่น","uni_en":"Khon Kaen","fac_th":"คณะแพทยศาสตร์","fac_en":"Medicine",
     "reqs":{"academic":{"min":3,"th":"วิชาการ","en":"Academic"},"volunteer":{"min":2,"th":"จิตอาสา","en":"Volunteer"}}},
    {"id":"edu_kku","uni_th":"มหาวิทยาลัยขอนแก่น","uni_en":"Khon Kaen","fac_th":"คณะศึกษาศาสตร์","fac_en":"Education",
     "reqs":{"volunteer":{"min":2,"th":"จิตอาสา","en":"Volunteer"},"leadership":{"min":2,"th":"ผู้นำ","en":"Leadership"}}},
    {"id":"medtech_kku","uni_th":"มหาวิทยาลัยขอนแก่น","uni_en":"Khon Kaen","fac_th":"คณะเทคนิคการแพทย์","fac_en":"Medical Technology",
     "reqs":{"academic":{"min":3,"th":"วิชาการ","en":"Academic"},"volunteer":{"min":1,"th":"จิตอาสา","en":"Volunteer"}}},
    {"id":"arch_kku","uni_th":"มหาวิทยาลัยขอนแก่น","uni_en":"Khon Kaen","fac_th":"คณะสถาปัตยกรรมศาสตร์","fac_en":"Architecture",
     "reqs":{"sport_art":{"min":3,"th":"ศิลปะ","en":"Art"},"academic":{"min":1,"th":"วิชาการ","en":"Academic"}}},

    # === มศว. (SWU) ===
    {"id":"edu_swu","uni_th":"มหาวิทยาลัยศรีนครินทรวิโรฒ","uni_en":"SWU","fac_th":"คณะศึกษาศาสตร์","fac_en":"Education",
     "reqs":{"volunteer":{"min":3,"th":"จิตอาสา","en":"Volunteer"},"leadership":{"min":1,"th":"ผู้นำ","en":"Leadership"}}},
    {"id":"med_swu","uni_th":"มหาวิทยาลัยศรีนครินทรวิโรฒ","uni_en":"SWU","fac_th":"คณะแพทยศาสตร์","fac_en":"Medicine",
     "reqs":{"academic":{"min":3,"th":"วิชาการ","en":"Academic"},"volunteer":{"min":2,"th":"จิตอาสา","en":"Volunteer"}}},
    {"id":"arts_swu","uni_th":"มหาวิทยาลัยศรีนครินทรวิโรฒ","uni_en":"SWU","fac_th":"คณะมนุษยศาสตร์","fac_en":"Humanities",
     "reqs":{"language":{"min":3,"th":"ภาษา","en":"Language"},"sport_art":{"min":1,"th":"ศิลปะ","en":"Art"}}},
    {"id":"fofa_swu","uni_th":"มหาวิทยาลัยศรีนครินทรวิโรฒ","uni_en":"SWU","fac_th":"คณะศิลปกรรมศาสตร์","fac_en":"Fine Arts",
     "reqs":{"sport_art":{"min":4,"th":"ศิลปะ","en":"Art"}}},

    # === ม.บูรพา (BUU) ===
    {"id":"nurs_buu","uni_th":"มหาวิทยาลัยบูรพา","uni_en":"BUU","fac_th":"คณะพยาบาลศาสตร์","fac_en":"Nursing",
     "reqs":{"academic":{"min":2,"th":"วิชาการ","en":"Academic"},"volunteer":{"min":2,"th":"จิตอาสา","en":"Volunteer"}}},
    {"id":"sci_buu","uni_th":"มหาวิทยาลัยบูรพา","uni_en":"BUU","fac_th":"คณะวิทยาศาสตร์","fac_en":"Science",
     "reqs":{"academic":{"min":2,"th":"วิชาการ","en":"Academic"}}},
    {"id":"marinesci_buu","uni_th":"มหาวิทยาลัยบูรพา","uni_en":"BUU","fac_th":"คณะวิทยาศาสตร์ทางทะเล","fac_en":"Marine Science",
     "reqs":{"academic":{"min":2,"th":"วิชาการ","en":"Academic"},"volunteer":{"min":2,"th":"จิตอาสา","en":"Volunteer"}}},

    # === ม.สงขลานครินทร์ (PSU) ===
    {"id":"med_psu","uni_th":"มหาวิทยาลัยสงขลานครินทร์","uni_en":"PSU","fac_th":"คณะแพทยศาสตร์","fac_en":"Medicine",
     "reqs":{"academic":{"min":3,"th":"วิชาการ","en":"Academic","details":"จำเป็นต้องมีผลงานวิชาการที่เกี่ยวข้องับ 3 วิชา (คณิตศาสตร์, ฟิสิกส์, เคมี) คะแนนขึ้นไป ต่อวิชาการคณิตศาสตร์ 2 วิชา คะแนน ขึ้นไป และ GPA ไม่น้อยกว่า 3.00"},
            "volunteer":{"min":2,"th":"จิตอาสา","en":"Volunteer","details":"ต้องมีกิจกรรมจิตอาสาอย่างน้อย 2 โครงการ โดยมีหลักฐานการทำงานจิตอาสาและสามารถแสดงบทบาทความมุมั่นในการทำงาน"}}},
    {"id":"eng_psu","uni_th":"มหาวิทยาลัยสงขลานครินทร์","uni_en":"PSU","fac_th":"คณะวิศวกรรมศาสตร์","fac_en":"Engineering",
     "reqs":{"academic":{"min":2,"th":"วิชาการ","en":"Academic","details":"ต้องมีผลงานวิชาการที่เกี่ยวข้องับวิศวกรรม เช่น โครงงาน วิทยาการ หรือ การแข่งขันวิทยาการ และมีผลการเรียนดี (GPA ไม่น้อยกว่า 2.75)"},
            "volunteer":{"min":1,"th":"จิตอาสา","en":"Volunteer","details":"ต้องมีกิจกรรมจิตอาสาที่แสดงถึงความรู้้และมีส่วนส่วนต่อสังคม พร้อมมีหลักฐานรับรอง"}}},
    {"id":"natres_psu","uni_th":"มหาวิทยาลัยสงขลานครินทร์","uni_en":"PSU","fac_th":"คณะทรัพยากรธรรมชาติ","fac_en":"Natural Resources",
     "reqs":{"academic":{"min":1,"th":"วิชาการ","en":"Academic"},"volunteer":{"min":2,"th":"จิตอาสา","en":"Volunteer"}}},

    # === ม.นเรศวร (NU) ===
    {"id":"med_nu","uni_th":"มหาวิทยาลัยนเรศวร","uni_en":"Naresuan","fac_th":"คณะแพทยศาสตร์","fac_en":"Medicine",
     "reqs":{"academic":{"min":3,"th":"วิชาการ","en":"Academic"},"volunteer":{"min":2,"th":"จิตอาสา","en":"Volunteer"}}},
    {"id":"eng_nu","uni_th":"มหาวิทยาลัยนเรศวร","uni_en":"Naresuan","fac_th":"คณะวิศวกรรมศาสตร์","fac_en":"Engineering",
     "reqs":{"academic":{"min":2,"th":"วิชาการ","en":"Academic"},"volunteer":{"min":1,"th":"จิตอาสา","en":"Volunteer"}}},
    {"id":"sci_nu","uni_th":"มหาวิทยาลัยนเรศวร","uni_en":"Naresuan","fac_th":"คณะวิทยาศาสตร์","fac_en":"Science",
     "reqs":{"academic":{"min":2,"th":"วิชาการ","en":"Academic"},"volunteer":{"min":1,"th":"จิตอาสา","en":"Volunteer"}}},
    {"id":"arch_nu","uni_th":"มหาวิทยาลัยนเรศวร","uni_en":"Naresuan","fac_th":"คณะสถาปัตยกรรมศาสตร์","fac_en":"Architecture",
     "reqs":{"sport_art":{"min":2,"th":"ศิลปะ","en":"Art"},"academic":{"min":1,"th":"วิชาการ","en":"Academic"}}},
    {"id":"com_nu","uni_th":"มหาวิทยาลัยนเรศวร","uni_en":"Naresuan","fac_th":"คณะสื่อสารมวลชน","fac_en":"Communication",
     "reqs":{"sport_art":{"min":2,"th":"ศิลปะ","en":"Art"},"language":{"min":2,"th":"ภาษา","en":"Language"}}},

    # === ม.พะเยา (UP) ===
    {"id":"med_up","uni_th":"มหาวิทยาลัยพะเยา","uni_en":"Phayao","fac_th":"คณะแพทยศาสตร์","fac_en":"Medicine",
     "reqs":{"academic":{"min":3,"th":"วิชาการ","en":"Academic"},"volunteer":{"min":2,"th":"จิตอาสา","en":"Volunteer"}}},
    {"id":"eng_up","uni_th":"มหาวิทยาลัยพะเยา","uni_en":"Phayao","fac_th":"คณะวิศวกรรมศาสตร์","fac_en":"Engineering",
     "reqs":{"academic":{"min":2,"th":"วิชาการ","en":"Academic"},"volunteer":{"min":1,"th":"จิตอาสา","en":"Volunteer"}}},
    {"id":"it_up","uni_th":"มหาวิทยาลัยพะเยา","uni_en":"Phayao","fac_th":"คณะเทคโนโลยีสารสนเทศ","fac_en":"IT",
     "reqs":{"academic":{"min":2,"th":"วิชาการ","en":"Academic"},"language":{"min":1,"th":"ภาษา","en":"Language"}}},

    # === ม.วลัยลักษณ์ (WU) ===
    {"id":"med_wu","uni_th":"มหาวิทยาลัยวลัยลักษณ์","uni_en":"Walailak","fac_th":"คณะแพทยศาสตร์","fac_en":"Medicine",
     "reqs":{"academic":{"min":3,"th":"วิชาการ","en":"Academic"},"volunteer":{"min":2,"th":"จิตอาสา","en":"Volunteer"}}},
    {"id":"eng_wu","uni_th":"มหาวิทยาลัยวลัยลักษณ์","uni_en":"Walailak","fac_th":"คณะวิศวกรรมศาสตร์","fac_en":"Engineering",
     "reqs":{"academic":{"min":2,"th":"วิชาการ","en":"Academic"},"volunteer":{"min":1,"th":"จิตอาสา","en":"Volunteer"}}},
    {"id":"it_wu","uni_th":"มหาวิทยาลัยวลัยลักษณ์","uni_en":"Walailak","fac_th":"คณะวิทยาการคอมพิวเตอร์และสารสนเทศ","fac_en":"Computer & IT",
     "reqs":{"academic":{"min":2,"th":"วิชาการ","en":"Academic"},"language":{"min":1,"th":"ภาษา","en":"Language"}}},
    {"id":"nurse_wu","uni_th":"มหาวิทยาลัยวลัยลักษณ์","uni_en":"Walailak","fac_th":"คณะพยาบาลศาสตร์","fac_en":"Nursing",
     "reqs":{"academic":{"min":2,"th":"วิชาการ","en":"Academic"},"volunteer":{"min":3,"th":"จิตอาสา","en":"Volunteer"}}},

    # === ม.อุบลราชธานี (UBU) ===
    {"id":"eng_ubu","uni_th":"มหาวิทยาลัยอุบลราชธานี","uni_en":"UBU","fac_th":"คณะวิศวกรรมศาสตร์","fac_en":"Engineering",
     "reqs":{"academic":{"min":2,"th":"วิชาการ","en":"Academic"},"volunteer":{"min":1,"th":"จิตอาสา","en":"Volunteer"}}},
    {"id":"sci_ubu","uni_th":"มหาวิทยาลัยอุบลราชธานี","uni_en":"UBU","fac_th":"คณะวิทยาศาสตร์","fac_en":"Science",
     "reqs":{"academic":{"min":2,"th":"วิชาการ","en":"Academic"},"volunteer":{"min":1,"th":"จิตอาสา","en":"Volunteer"}}},

    # === ม.ศิลปากร (SU) ===
    {"id":"arch_su","uni_th":"มหาวิทยาลัยศิลปากร","uni_en":"Silpakorn","fac_th":"คณะสถาปัตยกรรมศาสตร์","fac_en":"Architecture",
     "reqs":{"sport_art":{"min":3,"th":"ศิลปะ","en":"Art"},"academic":{"min":1,"th":"วิชาการ","en":"Academic"}}},
    {"id":"arts_su","uni_th":"มหาวิทยาลัยศิลปากร","uni_en":"Silpakorn","fac_th":"คณะอักษรศาสตร์","fac_en":"Arts",
     "reqs":{"language":{"min":3,"th":"ภาษา","en":"Language"},"volunteer":{"min":1,"th":"จิตอาสา","en":"Volunteer"}}},
    {"id":"commarts_su","uni_th":"มหาวิทยาลัยศิลปากร","uni_en":"Silpakorn","fac_th":"คณะนิเทศศาสตร์","fac_en":"Communication Arts",
     "reqs":{"sport_art":{"min":2,"th":"ศิลปะ","en":"Art"},"language":{"min":2,"th":"ภาษา","en":"Language"}}},
    {"id":"music_su","uni_th":"มหาวิทยาลัยศิลปากร","uni_en":"Silpakorn","fac_th":"คณะดนตรีและการแสดง","fac_en":"Music & Performing Arts",
     "reqs":{"sport_art":{"min":4,"th":"ศิลปะ","en":"Art"}}},

    # === ม.รังสิต (RSU) ===
    {"id":"med_rsu","uni_th":"มหาวิทยาลัยรังสิต","uni_en":"Rangsit","fac_th":"คณะแพทยศาสตร์","fac_en":"Medicine",
     "reqs":{"academic":{"min":3,"th":"วิชาการ","en":"Academic"},"volunteer":{"min":2,"th":"จิตอาสา","en":"Volunteer"}}},
    {"id":"eng_rsu","uni_th":"มหาวิทยาลัยรังสิต","uni_en":"Rangsit","fac_th":"คณะวิศวกรรมศาสตร์","fac_en":"Engineering",
     "reqs":{"academic":{"min":2,"th":"วิชาการ","en":"Academic"},"volunteer":{"min":1,"th":"จิตอาสา","en":"Volunteer"}}},
    {"id":"comm_rsu","uni_th":"มหาวิทยาลัยรังสิต","uni_en":"Rangsit","fac_th":"คณะนิเทศศาสตร์","fac_en":"Communication Arts",
     "reqs":{"sport_art":{"min":2,"th":"ศิลปะ","en":"Art"},"language":{"min":2,"th":"ภาษา","en":"Language"}}},
    {"id":"law_rsu","uni_th":"มหาวิทยาลัยรังสิต","uni_en":"Rangsit","fac_th":"คณะนิติศาสตร์","fac_en":"Law",
     "reqs":{"academic":{"min":2,"th":"วิชาการ","en":"Academic"},"leadership":{"min":2,"th":"ผู้นำ","en":"Leadership"}}},

    # === ม.อัสสัมชัญ (ABAC) ===
    {"id":"bus_abac","uni_th":"มหาวิทยาลัยอัสสัมชัญ","uni_en":"ABAC","fac_th":"คณะบริหารธุรกิจ","fac_en":"Business",
     "reqs":{"academic":{"min":1,"th":"วิชาการ","en":"Academic"},"leadership":{"min":2,"th":"ผู้นำ","en":"Leadership"}}},
    {"id":"comm_abac","uni_th":"มหาวิทยาลัยอัสสัมชัญ","uni_en":"ABAC","fac_th":"คณะนิเทศศาสตร์","fac_en":"Communication Arts",
     "reqs":{"sport_art":{"min":2,"th":"ศิลปะ","en":"Art"},"language":{"min":2,"th":"ภาษา","en":"Language"}}},
    {"id":"arts_abac","uni_th":"มหาวิทยาลัยอัสสัมชัญ","uni_en":"ABAC","fac_th":"คณะศิลปกรรมศาสตร์","fac_en":"Fine Arts",
     "reqs":{"sport_art":{"min":3,"th":"ศิลปะ","en":"Art"}}},
    {"id":"law_abac","uni_th":"มหาวิทยาลัยอัสสัมชัญ","uni_en":"ABAC","fac_th":"คณะนิติศาสตร์","fac_en":"Law",
     "reqs":{"academic":{"min":2,"th":"วิชาการ","en":"Academic"},"leadership":{"min":2,"th":"ผู้นำ","en":"Leadership"}}},

    # === ม.หอการค้าไทย (UTCC) ===
    {"id":"bus_utcc","uni_th":"มหาวิทยาลัยหอการค้าไทย","uni_en":"UTCC","fac_th":"คณะบริหารธุรกิจ","fac_en":"Business",
     "reqs":{"academic":{"min":1,"th":"วิชาการ","en":"Academic"},"leadership":{"min":2,"th":"ผู้นำ","en":"Leadership"}}},
    {"id":"acc_utcc","uni_th":"มหาวิทยาลัยหอการค้าไทย","uni_en":"UTCC","fac_th":"คณะบัญชี","fac_en":"Accountancy",
     "reqs":{"academic":{"min":2,"th":"วิชาการ","en":"Academic"},"leadership":{"min":1,"th":"ผู้นำ","en":"Leadership"}}},
    {"id":"it_utcc","uni_th":"มหาวิทยาลัยหอการค้าไทย","uni_en":"UTCC","fac_th":"คณะเทคโนโลยีสารสนเทศ","fac_en":"IT",
     "reqs":{"academic":{"min":2,"th":"วิชาการ","en":"Academic"},"language":{"min":1,"th":"ภาษา","en":"Language"}}},

    # === ม.กรุงเทพ (BU) ===
    {"id":"arts_bu","uni_th":"มหาวิทยาลัยกรุงเทพ","uni_en":"Bangkok","fac_th":"คณะศิลปกรรมศาสตร์","fac_en":"Fine Arts",
     "reqs":{"sport_art":{"min":3,"th":"ศิลปะ","en":"Art"}}},
    {"id":"comm_bu","uni_th":"มหาวิทยาลัยกรุงเทพ","uni_en":"Bangkok","fac_th":"คณะนิเทศศาสตร์","fac_en":"Communication Arts",
     "reqs":{"sport_art":{"min":2,"th":"ศิลปะ","en":"Art"},"language":{"min":2,"th":"ภาษา","en":"Language"}}},
    {"id":"eng_bu","uni_th":"มหาวิทยาลัยกรุงเทพ","uni_en":"Bangkok","fac_th":"คณะวิศวกรรมศาสตร์","fac_en":"Engineering",
     "reqs":{"academic":{"min":2,"th":"วิชาการ","en":"Academic"},"volunteer":{"min":1,"th":"จิตอาสา","en":"Volunteer"}}},

    # === ม.เทคโนโลยีพระจอมเกล้าพระนครเหนือ (KMUTNB) ===
    {"id":"eng_kmutnb","uni_th":"มหาวิทยาลัยเทคโนโลยีพระจอมเกล้าพระนครเหนือ","uni_en":"KMUTNB","fac_th":"คณะวิศวกรรมศาสตร์","fac_en":"Engineering",
     "reqs":{"academic":{"min":3,"th":"วิชาการ","en":"Academic"},"volunteer":{"min":1,"th":"จิตอาสา","en":"Volunteer"}}},
    {"id":"it_kmutnb","uni_th":"มหาวิทยาลัยเทคโนโลยีพระจอมเกล้าพระนครเหนือ","uni_en":"KMUTNB","fac_th":"คณะเทคโนโลยีสารสนเทศ","fac_en":"IT",
     "reqs":{"academic":{"min":2,"th":"วิชาการ","en":"Academic"},"language":{"min":1,"th":"ภาษา","en":"Language"}}},
    {"id":"sci_kmutnb","uni_th":"มหาวิทยาลัยเทคโนโลยีพระจอมเกล้าพระนครเหนือ","uni_en":"KMUTNB","fac_th":"คณะวิทยาศาสตร์ประยุกต์","fac_en":"Applied Science",
     "reqs":{"academic":{"min":2,"th":"วิชาการ","en":"Academic"},"volunteer":{"min":1,"th":"จิตอาสา","en":"Volunteer"}}},

    # === ม.เทคโนโลยีราชมงคลธัญบุรี (RMUTT) ===
    {"id":"eng_rmutt","uni_th":"มหาวิทยาลัยเทคโนโลยีราชมงคลธัญบุรี","uni_en":"RMUTT","fac_th":"คณะวิศวกรรมศาสตร์","fac_en":"Engineering",
     "reqs":{"academic":{"min":2,"th":"วิชาการ","en":"Academic"},"volunteer":{"min":1,"th":"จิตอาสา","en":"Volunteer"}}},
    {"id":"it_rmutt","uni_th":"มหาวิทยาลัยเทคโนโลยีราชมงคลธัญบุรี","uni_en":"RMUTT","fac_th":"คณะเทคโนโลยีสารสนเทศ","fac_en":"IT",
     "reqs":{"academic":{"min":2,"th":"วิชาการ","en":"Academic"},"language":{"min":1,"th":"ภาษา","en":"Language"}}},
    {"id":"bus_rmutt","uni_th":"มหาวิทยาลัยเทคโนโลยีราชมงคลธัญบุรี","uni_en":"RMUTT","fac_th":"คณะบริหารธุรกิจ","fac_en":"Business",
     "reqs":{"academic":{"min":1,"th":"วิชาการ","en":"Academic"},"leadership":{"min":2,"th":"ผู้นำ","en":"Leadership"}}},

    # === ม.สุโขทัยธรรมาธิราช (STOU) ===
    {"id":"edu_stou","uni_th":"มหาวิทยาลัยสุโขทัยธรรมาธิราช","uni_en":"STOU","fac_th":"คณะศึกษาศาสตร์","fac_en":"Education",
     "reqs":{"volunteer":{"min":2,"th":"จิตอาสา","en":"Volunteer"},"leadership":{"min":2,"th":"ผู้นำ","en":"Leadership"}}},
    {"id":"arts_stou","uni_th":"มหาวิทยาลัยสุโขทัยธรรมาธิราช","uni_en":"STOU","fac_th":"คณะมนุษยศาสตร์และสังคมศาสตร์","fac_en":"Humanities & Social Sciences",
     "reqs":{"language":{"min":2,"th":"ภาษา","en":"Language"},"volunteer":{"min":1,"th":"จิตอาสา","en":"Volunteer"}}},

    # === ม.เทคโนโลยีมหานคร (MUT) ===
    {"id":"eng_mut","uni_th":"มหาวิทยาลัยเทคโนโลยีมหานคร","uni_en":"MUT","fac_th":"คณะวิศวกรรมศาสตร์","fac_en":"Engineering",
     "reqs":{"academic":{"min":2,"th":"วิชาการ","en":"Academic"},"volunteer":{"min":1,"th":"จิตอาสา","en":"Volunteer"}}},
    {"id":"it_mut","uni_th":"มหาวิทยาลัยเทคโนโลยีมหานคร","uni_en":"MUT","fac_th":"คณะเทคโนโลยีสารสนเทศ","fac_en":"IT",
     "reqs":{"academic":{"min":2,"th":"วิชาการ","en":"Academic"},"language":{"min":1,"th":"ภาษา","en":"Language"}}},
    {"id":"arch_mut","uni_th":"มหาวิทยาลัยเทคโนโลยีมหานคร","uni_en":"MUT","fac_th":"คณะสถาปัตยกรรมศาสตร์","fac_en":"Architecture",
     "reqs":{"sport_art":{"min":3,"th":"ศิลปะ","en":"Art"},"academic":{"min":1,"th":"วิชาการ","en":"Academic"}}},

    # === ม.ธุรกิจบัณฑิตย์ (DPU) ===
    {"id":"bus_dpu","uni_th":"มหาวิทยาลัยธุรกิจบัณฑิตย์","uni_en":"DPU","fac_th":"คณะบริหารธุรกิจ","fac_en":"Business",
     "reqs":{"academic":{"min":1,"th":"วิชาการ","en":"Academic"},"leadership":{"min":2,"th":"ผู้นำ","en":"Leadership"}}},
    {"id":"comm_dpu","uni_th":"มหาวิทยาลัยธุรกิจบัณฑิตย์","uni_en":"DPU","fac_th":"คณะนิเทศศาสตร์","fac_en":"Communication Arts",
     "reqs":{"sport_art":{"min":2,"th":"ศิลปะ","en":"Art"},"language":{"min":2,"th":"ภาษา","en":"Language"}}},
    {"id":"it_dpu","uni_th":"มหาวิทยาลัยธุรกิจบัณฑิตย์","uni_en":"DPU","fac_th":"คณะเทคโนโลยีสารสนเทศ","fac_en":"IT",
     "reqs":{"academic":{"min":2,"th":"วิชาการ","en":"Academic"},"language":{"min":1,"th":"ภาษา","en":"Language"}}},

    # === ม.สยาม (SU-Siam) ===
    {"id":"comm_siam","uni_th":"มหาวิทยาลัยสยาม","uni_en":"Siam","fac_th":"คณะนิเทศศาสตร์","fac_en":"Communication Arts",
     "reqs":{"sport_art":{"min":2,"th":"ศิลปะ","en":"Art"},"language":{"min":2,"th":"ภาษา","en":"Language"}}},
    {"id":"eng_siam","uni_th":"มหาวิทยาลัยสยาม","uni_en":"Siam","fac_th":"คณะวิศวกรรมศาสตร์","fac_en":"Engineering",
     "reqs":{"academic":{"min":2,"th":"วิชาการ","en":"Academic"},"volunteer":{"min":1,"th":"จิตอาสา","en":"Volunteer"}}},
    {"id":"arts_siam","uni_th":"มหาวิทยาลัยสยาม","uni_en":"Siam","fac_th":"คณะศิลปกรรมศาสตร์","fac_en":"Fine Arts",
     "reqs":{"sport_art":{"min":3,"th":"ศิลปะ","en":"Art"}}},

    # === ม.ราชภัฏสวนสุนันทา (SSRU) ===
    {"id":"edu_ssru","uni_th":"มหาวิทยาลัยราชภัฏสวนสุนันทา","uni_en":"SSRU","fac_th":"คณะครุศาสตร์","fac_en":"Education",
     "reqs":{"volunteer":{"min":2,"th":"จิตอาสา","en":"Volunteer"},"leadership":{"min":2,"th":"ผู้นำ","en":"Leadership"}}},
    {"id":"arts_ssru","uni_th":"มหาวิทยาลัยราชภัฏสวนสุนันทา","uni_en":"SSRU","fac_th":"คณะมนุษยศาสตร์และสังคมศาสตร์","fac_en":"Humanities & Social Sciences",
     "reqs":{"language":{"min":2,"th":"ภาษา","en":"Language"},"volunteer":{"min":1,"th":"จิตอาสา","en":"Volunteer"}}},

    # === ม.ราชภัฏจันทรเกษม (CRU) ===
    {"id":"edu_cru","uni_th":"มหาวิทยาลัยราชภัฏจันทรเกษม","uni_en":"CRU","fac_th":"คณะศึกษาศาสตร์","fac_en":"Education",
     "reqs":{"volunteer":{"min":2,"th":"จิตอาสา","en":"Volunteer"},"leadership":{"min":2,"th":"ผู้นำ","en":"Leadership"}}},
    {"id":"sci_cru","uni_th":"มหาวิทยาลัยราชภัฏจันทรเกษม","uni_en":"CRU","fac_th":"คณะวิทยาศาสตร์และเทคโนโลยี","fac_en":"Science & Technology",
     "reqs":{"academic":{"min":2,"th":"วิชาการ","en":"Academic"},"volunteer":{"min":1,"th":"จิตอาสา","en":"Volunteer"}}},

    # === ม.รามคำแหง (RU) ===
    {"id":"law_ru","uni_th":"มหาวิทยาลัยรามคำแหง","uni_en":"Ramkhamhaeng","fac_th":"คณะนิติศาสตร์","fac_en":"Law",
     "reqs":{"academic":{"min":2,"th":"วิชาการ","en":"Academic"},"leadership":{"min":2,"th":"ผู้นำ","en":"Leadership"}}},
    {"id":"bus_ru","uni_th":"มหาวิทยาลัยรามคำแหง","uni_en":"Ramkhamhaeng","fac_th":"คณะพาณิชยศาสตร์และการบัญชี","fac_en":"Commerce & Accountancy",
     "reqs":{"academic":{"min":1,"th":"วิชาการ","en":"Academic"},"leadership":{"min":2,"th":"ผู้นำ","en":"Leadership"}}},
    {"id":"arts_ru","uni_th":"มหาวิทยาลัยรามคำแหง","uni_en":"Ramkhamhaeng","fac_th":"คณะมนุษยศาสตร์","fac_en":"Humanities",
     "reqs":{"language":{"min":2,"th":"ภาษา","en":"Language"},"volunteer":{"min":1,"th":"จิตอาสา","en":"Volunteer"}}},

]

TCAS_DEADLINE = "2026-12-20T23:59:59"

@app.route('/api/health')
def health():
    return jsonify({"status":"ok","camp_parser":HAS_CP})

@app.route('/api/config')
def config():
    return jsonify({"tcas_deadline":TCAS_DEADLINE,"categories":[{"slug":k,**v} for k,v in CATS.items()],"colors":COLORS})

@app.route('/api/activities')
def activities():
    items = fetch_all()
    # Filter out expired activities
    EXPIRED_KEYWORDS = ['ปิดรับสมัครแล้ว', 'หมดเขต', 'ปิดรับแล้ว', 'สิ้นสุดแล้ว']
    items = [a for a in items if not any(kw in (a.get('deadline','') or '') for kw in EXPIRED_KEYWORDS)]
    t = request.args.get('type')
    m = request.args.get('month')
    c = request.args.get('category')
    if t: items = [a for a in items if a['type']==t]
    if m: items = [a for a in items if str(a['month'])==m]
    if c: items = [a for a in items if a['category_slug']==c]
    return jsonify(items)

@app.route('/api/activities/recommended')
def recommended():
    t = request.args.get('type','academic')
    return jsonify([a for a in fetch_all() if a['type']==t][:3])

@app.route('/api/faculties')
def faculties():
    return jsonify(get_faculties_dataset())

@app.route('/api/faculties/<fid>')
def faculty(fid):
    for f in get_faculties_dataset():
        if f['id']==fid: return jsonify(f)
    return jsonify({"error":"Not found"}), 404

@app.route('/api/university-programs')
def university_programs():
    faculties = get_faculties_dataset()
    grouped = {}
    for f in faculties:
        uni = f.get("uni_th") or f.get("uni_en") or ""
        if not uni:
            continue
        if uni not in grouped:
            grouped[uni] = {"university": uni, "programs": []}
        grouped[uni]["programs"].append({
            "id": f.get("id"),
            "name": f.get("fac_th") or f.get("fac_en") or "",
            "faculty_group": f.get("faculty_group_th") or "",
            "group_field": f.get("group_field_th") or "",
            "field_name": f.get("field_name_th") or "",
            "campus": f.get("campus_th") or "",
            "major_acceptance_number": f.get("major_acceptance_number"),
            "reqs": f.get("reqs", {}),
        })
    result = list(grouped.values())
    result.sort(key=lambda x: x["university"])
    return jsonify(result)

@app.route('/api/categories')
def categories():
    return jsonify([{"slug":k,"type":v['type'],"type_th":v['th'],"type_en":v['en'],"color":COLORS.get(v['type'],'#3B2FCC')} for k,v in CATS.items()])

def prefetch():
    print("[INFO] Pre-fetching...")
    try:
        fetch_all()
        print(f"[INFO] Cached {len(CACHE.get('all',{}).get('d',[]))} activities")
    except Exception as e:
        print(f"[WARN] {e}")

if __name__ == '__main__':
    if not os.environ.get("VERCEL"):
        threading.Thread(target=prefetch, daemon=True).start()
    print("[INFO] TCASX API on http://localhost:5000")
    app.run(host='0.0.0.0', port=5000, debug=True)
