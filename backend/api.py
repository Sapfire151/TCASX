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
            if link:
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
    {"id":"eng_chula","uni_th":"จุฬาลงกรณ์มหาวิทยาลัย","uni_en":"Chulalongkorn University",
     "fac_th":"คณะวิศวกรรมศาสตร์","fac_en":"Faculty of Engineering",
     "reqs":{"academic":{"min":3,"th":"กิจกรรมวิชาการ","en":"Academic Activities"},
             "volunteer":{"min":1,"th":"จิตอาสา","en":"Volunteer Work"},
             "leadership":{"min":1,"th":"ภาวะผู้นำ","en":"Leadership"},
             "language":{"min":1,"th":"ทักษะภาษา","en":"Language Skills"}},
     "cats":["computer","science","engineer"]},
    {"id":"med_chula","uni_th":"จุฬาลงกรณ์มหาวิทยาลัย","uni_en":"Chulalongkorn University",
     "fac_th":"คณะแพทยศาสตร์","fac_en":"Faculty of Medicine",
     "reqs":{"academic":{"min":3,"th":"กิจกรรมวิชาการ","en":"Academic Activities"},
             "volunteer":{"min":2,"th":"จิตอาสา","en":"Volunteer Work"},
             "leadership":{"min":1,"th":"ภาวะผู้นำ","en":"Leadership"},
             "language":{"min":1,"th":"ทักษะภาษา","en":"Language Skills"}},
     "cats":["medical-health/doctor","science"]},
    {"id":"eng_tu","uni_th":"มหาวิทยาลัยธรรมศาสตร์","uni_en":"Thammasat University",
     "fac_th":"คณะวิศวกรรมศาสตร์","fac_en":"Faculty of Engineering",
     "reqs":{"academic":{"min":2,"th":"กิจกรรมวิชาการ","en":"Academic Activities"},
             "volunteer":{"min":1,"th":"จิตอาสา","en":"Volunteer Work"},
             "sport_art":{"min":1,"th":"กีฬา/ศิลปะ","en":"Sports & Art"}},
     "cats":["computer","science","engineer"]},
    {"id":"sci_mu","uni_th":"มหาวิทยาลัยมหิดล","uni_en":"Mahidol University",
     "fac_th":"คณะวิทยาศาสตร์","fac_en":"Faculty of Science",
     "reqs":{"academic":{"min":3,"th":"กิจกรรมวิชาการ","en":"Academic Activities"},
             "volunteer":{"min":1,"th":"จิตอาสา","en":"Volunteer Work"},
             "language":{"min":1,"th":"ทักษะภาษา","en":"Language Skills"}},
     "cats":["science"]},
    {"id":"cs_kmitl","uni_th":"สจล.","uni_en":"KMITL",
     "fac_th":"คณะเทคโนโลยีสารสนเทศ","fac_en":"Faculty of IT",
     "reqs":{"academic":{"min":2,"th":"กิจกรรมวิชาการ","en":"Academic Activities"},
             "volunteer":{"min":1,"th":"จิตอาสา","en":"Volunteer Work"}},
     "cats":["computer"]},
    {"id":"eng_ku","uni_th":"มหาวิทยาลัยเกษตรศาสตร์","uni_en":"Kasetsart University",
     "fac_th":"คณะวิศวกรรมศาสตร์","fac_en":"Faculty of Engineering",
     "reqs":{"academic":{"min":2,"th":"กิจกรรมวิชาการ","en":"Academic Activities"},
             "volunteer":{"min":1,"th":"จิตอาสา","en":"Volunteer Work"},
             "leadership":{"min":1,"th":"ภาวะผู้นำ","en":"Leadership"}},
     "cats":["engineer","computer"]},
    {"id":"arts_cu","uni_th":"จุฬาลงกรณ์มหาวิทยาลัย","uni_en":"Chulalongkorn University",
     "fac_th":"คณะอักษรศาสตร์","fac_en":"Faculty of Arts",
     "reqs":{"language":{"min":3,"th":"ทักษะภาษา","en":"Language Skills"},
             "academic":{"min":1,"th":"กิจกรรมวิชาการ","en":"Academic Activities"},
             "volunteer":{"min":1,"th":"จิตอาสา","en":"Volunteer Work"}},
     "cats":["lang-human"]},
    {"id":"polsci_tu","uni_th":"มหาวิทยาลัยธรรมศาสตร์","uni_en":"Thammasat University",
     "fac_th":"คณะรัฐศาสตร์","fac_en":"Faculty of Political Science",
     "reqs":{"leadership":{"min":2,"th":"ภาวะผู้นำ","en":"Leadership"},
             "volunteer":{"min":2,"th":"จิตอาสา","en":"Volunteer Work"},
             "language":{"min":1,"th":"ทักษะภาษา","en":"Language Skills"}},
     "cats":["political"]},
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
    threading.Thread(target=prefetch, daemon=True).start()
    print("[INFO] TCASX API on http://localhost:5000")
    app.run(host='0.0.0.0', port=5000, debug=True)
