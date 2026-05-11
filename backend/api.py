"""
TCASX Backend API — serves activity data from camp_parser + BeautifulSoup.
Run: python api.py
"""
import json, os, re, time, threading
from datetime import datetime
from flask import Flask, jsonify, request
from flask_cors import CORS
import requests as http_req
from bs4 import BeautifulSoup

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
        r = http_req.get(url, headers=UA, timeout=15)
        soup = BeautifulSoup(r.content, 'html.parser')
        arts = soup.find_all('article')
        res = []
        for a in arts:
            tt = a.find(['h2','h3','h4'])
            title = tt.text.strip() if tt else "Unknown"
            lt = a.find('a')
            link = lt['href'] if lt and lt.get('href') else ""
            img = a.find('img')
            image = img.get('src','') if img else ''
            dl_str, spots = "", 50
            if link and not os.environ.get("VERCEL"):
                try:
                    dr = http_req.get(link, headers=UA, timeout=10)
                    ds = BeautifulSoup(dr.content, 'html.parser')
                    tx = ds.get_text()
                    if "ปิดรับสมัคร" in tx:
                        i = tx.find("ปิดรับสมัคร")
                        dl_str = tx[i:i+40].replace('\n',' ').strip()
                    if "จำนวนที่รับ" in tx:
                        i = tx.find("จำนวนที่รับ")
                        spots = ex_num(tx[i:i+30])
                except: pass
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
    for slug in CATS:
        print(f"  Fetching {slug}...")
        for it in fetch_cat(slug):
            it["id"] = idx; idx += 1
            items.append(it)
    cache_set("all", items)
    return items

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
     "reqs":{"academic":{"min":3,"th":"วิชาการ","en":"Academic"},"volunteer":{"min":2,"th":"จิตอาสา","en":"Volunteer"}}},
    {"id":"eng_psu","uni_th":"มหาวิทยาลัยสงขลานครินทร์","uni_en":"PSU","fac_th":"คณะวิศวกรรมศาสตร์","fac_en":"Engineering",
     "reqs":{"academic":{"min":2,"th":"วิชาการ","en":"Academic"},"volunteer":{"min":1,"th":"จิตอาสา","en":"Volunteer"}}},
    {"id":"natres_psu","uni_th":"มหาวิทยาลัยสงขลานครินทร์","uni_en":"PSU","fac_th":"คณะทรัพยากรธรรมชาติ","fac_en":"Natural Resources",
     "reqs":{"academic":{"min":1,"th":"วิชาการ","en":"Academic"},"volunteer":{"min":2,"th":"จิตอาสา","en":"Volunteer"}}},

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
    return jsonify(FACULTIES)

@app.route('/api/faculties/<fid>')
def faculty(fid):
    for f in FACULTIES:
        if f['id']==fid: return jsonify(f)
    return jsonify({"error":"Not found"}), 404

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
