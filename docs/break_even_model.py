# โมเดลรายรับ-รายจ่าย-กำไร ของ Passport AI และกราฟจุดคุ้มทุน (docs/break-even-chart.png)
# รัน: pip install matplotlib แล้ว python docs/break_even_model.py <matplotlib_path_หรือ_.> <โฟลเดอร์ฟอนต์ IBM Plex Sans Thai> <ไฟล์ผลลัพธ์.png>
# ปรับสมมติฐานได้ที่ PKG (การใช้งานต่อทริป), MIX199, FREE_RATIO, MONTHS และฟังก์ชัน month()

import sys
sys.path.insert(0, sys.argv[1])
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
from matplotlib import font_manager as fm
from matplotlib.ticker import FuncFormatter
FONT_DIR, OUT = sys.argv[2], sys.argv[3]
for w in ['Regular', 'SemiBold', 'Bold']:
    fm.fontManager.addfont(f'{FONT_DIR}/IBMPlexSansThai-{w}.ttf')
plt.rcParams['font.family'] = 'IBM Plex Sans Thai'

# ---------------- โมเดลต้นทุน (เหมือนรอบก่อน + geocoding แบบปรับแล้ว) ----------------
FX = 33.0
GEM_IN, GEM_OUT = 0.30/1e6, 2.50/1e6
ai = lambda tin, tout: tin*GEM_IN + tout*GEM_OUT
CHAT = ai(2000, 300) + 0.10*ai(1300, 0)
PASSPORT, CAPTIONS, DOC = ai(12000, 3000), 12*ai(1200, 40), ai(3000, 500)
MB = 0.45
PKG = {
  'free': dict(price=0,   photos=150, chats=30,  gens=1, docs=1, eg=0.10),
  'p149': dict(price=149, photos=600, chats=80,  gens=3, docs=3, eg=0.40),
  'p199': dict(price=199, photos=900, chats=400, gens=6, docs=5, eg=0.60),
}
aic = lambda p: p['chats']*CHAT + p['gens']*PASSPORT + CAPTIONS + p['docs']*DOC
gb = lambda p: p['photos']*MB/1024
PAY_FEE = 0.5*0.0365*1.07 + 0.5*0.0165*1.07
MIX199, FREE_RATIO, MONTHS = 0.4, 5, 12

def month(paid):
    n149, n199, nfree = paid*(1-MIX199), paid*MIX199, paid*FREE_RATIO
    rev = n149*149 + n199*199
    v_ai = (n149*aic(PKG['p149']) + n199*aic(PKG['p199']) + nfree*aic(PKG['free']))*FX
    fee = rev*PAY_FEE
    stored = (n149*gb(PKG['p149']) + n199*gb(PKG['p199']) + nfree*gb(PKG['free']))*MONTHS
    stor = max(0, stored-100)*0.021*FX
    eg = n149*PKG['p149']['eg'] + n199*PKG['p199']['eg'] + nfree*PKG['free']['eg']
    egr = max(0, eg-250)*0.09*FX
    compute = 0 if paid <= 100 else (5 if paid <= 600 else 50)
    geo = 0 if paid <= 1500 else 49        # แคชกลาง + LocationIQ ฟรี 5,000/วัน
    fixed = (25 + compute + geo + 15/12)*FX
    cost = v_ai + fee + stor + egr + fixed
    return rev, cost, rev-cost

# จุดคุ้มทุน (ละเอียด 0.01 ทริป)
be = next(x/100 for x in range(1, 100000) if month(x/100)[2] >= 0)
print('break-even trips/month =', round(be, 2), 'fixed =', round(month(0)[1]))

# ---------------- สี/สไตล์ (dataviz reference palette, slots 1-3 ผ่าน validator) ----------------
SURF, INK, INK2, GRID = '#fcfcfb', '#0b0b0b', '#52514e', '#e6e5e1'
C_REV, C_COST, C_PROF = '#2a78d6', '#eb6834', '#1baf7a'
thb = lambda v, _=None: f'{v:,.0f}'
thbk = lambda v, _=None: f'{v/1000:,.0f}K' if abs(v) >= 1000 else f'{v:,.0f}'

fig, axes = plt.subplots(1, 2, figsize=(16, 8.2), dpi=150, gridspec_kw=dict(width_ratios=[1, 1.25], wspace=0.22))
fig.patch.set_facecolor(SURF)

def panel(ax, xmax, step, fmt, title, label_at_end=True):
    xs = [i*step for i in range(int(xmax/step)+1)]
    R, C, P = zip(*[month(x) for x in xs])
    ax.set_facecolor(SURF)
    for s in ['top', 'right']: ax.spines[s].set_visible(False)
    for s in ['left', 'bottom']: ax.spines[s].set_color(GRID)
    ax.grid(axis='y', color=GRID, linewidth=0.8); ax.set_axisbelow(True)
    ax.axhline(0, color=INK2, linewidth=0.9)
    kw = dict(linewidth=2.2, solid_capstyle='round', solid_joinstyle='round')
    ax.plot(xs, R, color=C_REV, **kw)
    ax.plot(xs, C, color=C_COST, **kw)
    ax.plot(xs, P, color=C_PROF, **kw)
    ax.tick_params(colors=INK2, labelsize=11, length=0)
    ax.yaxis.set_major_formatter(FuncFormatter(fmt)); ax.xaxis.set_major_formatter(FuncFormatter(thb))
    ax.set_xlim(0, xmax * (1.16 if label_at_end else 1.0))
    ax.set_xlabel('จำนวนทริปที่จ่ายเงินต่อเดือน', color=INK2, fontsize=12)
    ax.set_ylabel('บาทต่อเดือน', color=INK2, fontsize=12)
    ax.set_title(title, loc='left', color=INK, fontsize=15, fontweight='bold', pad=12)
    # ป้ายท้ายเส้น (ข้อความสีหมึก + จุดสีบอกตัวตน)
    ends = [(R[-1], C_REV, 'รายรับ'), (C[-1], C_COST, 'รายจ่าย'), (P[-1], C_PROF, 'กำไร')]
    for y, c, name in ends:
        ax.plot([xs[-1]], [y], 'o', color=c, markersize=8, markeredgecolor=SURF, markeredgewidth=2, zorder=5)
        ax.annotate(f'{name}\n{fmt(y)} บาท', (xs[-1], y), xytext=(10, 0), textcoords='offset points',
                    va='center', fontsize=11.5, color=INK, fontweight='semibold')
    return xs, R, C, P

# ซ้าย: ซูมจุดคุ้มทุน
xs, R, C, P = panel(axes[0], 40, 0.25, thb, 'ซูมช่วงเริ่มต้น: 0–40 ทริป')
_, cost_be, _ = month(be)
ax = axes[0]
ax.axvline(be, color=INK2, linewidth=0.9, linestyle=(0, (1, 0)), alpha=0.5)
ax.plot([be], [0], 'o', color=INK, markersize=9, markeredgecolor=SURF, markeredgewidth=2, zorder=6)
ax.annotate(f'คุ้มทุนที่ ~{be:.1f} ทริป → ขั้นต่ำ 7 ทริป/เดือน\nต้นทุนคงที่ {month(0)[1]:,.0f} บาท/เดือน (Supabase Pro + โดเมน)', (be, 0), xytext=(14, -58),
            textcoords='offset points', fontsize=12, color=INK, fontweight='bold',
            arrowprops=dict(arrowstyle='-', color=INK2, linewidth=0.9))
ax.fill_between(xs, P, 0, where=[p < 0 for p in P], color=C_COST, alpha=0.10, linewidth=0)
ax.fill_between(xs, P, 0, where=[p >= 0 for p in P], color=C_PROF, alpha=0.10, linewidth=0)
ax.text(0.4, -260, 'ขาดทุน', color=INK2, fontsize=11)
ax.text(31, 450, 'โซนกำไร', color=INK2, fontsize=11)

# ขวา: ภาพรวม 0-1,000
xs2, R2, C2, P2 = panel(axes[1], 1000, 5, thbk, 'ภาพรวม: 0–1,000 ทริป')
for x in [300]:
    r, c, p = month(x)
    axes[1].plot([x], [p], 'o', color=C_PROF, markersize=8, markeredgecolor=SURF, markeredgewidth=2, zorder=5)
    axes[1].annotate(f'{x} ทริป → กำไร {p:,.0f} บาท', (x, p), xytext=(10, -12), textcoords='offset points',
                     ha='left', va='top', fontsize=10.5, color=INK2)
axes[1].annotate('600+ ทริป: อัปเกรดเซิร์ฟเวอร์\n(+1,485 บาท/เดือน)', (605, month(605)[1]), xytext=(8, -34),
                 textcoords='offset points', ha='left', va='top', fontsize=10.5, color=INK2,
                 arrowprops=dict(arrowstyle='-', color=INK2, linewidth=0.8))

fig.suptitle('Passport AI — รายรับ รายจ่าย และกำไร ต่อเดือน', x=0.06, y=0.995, ha='left', fontsize=21, fontweight='bold', color=INK)
fig.text(0.06, 0.925, 'ราคา 149 / 199 บาทต่อทริป (สัดส่วน 60:40) · ผู้ใช้ฟรี 5 ทริปต่อ 1 ทริปที่จ่าย · AI = Gemini 3.5 Flash-Lite · '
         'รวม Supabase Pro, ค่าเก็บรูปสะสม 12 เดือน, egress, ค่าธรรมเนียมรับเงิน · ไม่รวมค่าแรง/การตลาด/ภาษี',
         ha='left', fontsize=11, color=INK2)
# legend (สำหรับ >= 2 series)
from matplotlib.lines import Line2D
handles = [Line2D([0], [0], color=c, linewidth=3) for c in (C_REV, C_COST, C_PROF)]
fig.legend(handles, ['รายรับ', 'รายจ่าย', 'กำไร'], loc='upper right', bbox_to_anchor=(0.985, 0.995), ncol=3, frameon=False, fontsize=12.5, labelcolor=INK)
fig.subplots_adjust(left=0.06, right=0.97, top=0.84, bottom=0.1)
fig.savefig(OUT, facecolor=SURF)

print('\nตาราง:')
for x in [0, 5, 7, 10, 20, 30, 50, 100, 200, 300, 500, 700, 1000]:
    r, c, p = month(x)
    print(f'{x:5d} | รายรับ {r:9,.0f} | รายจ่าย {c:8,.0f} | กำไร {p:9,.0f} | ROI {"-" if c==0 else f"{p/c*100:,.0f}%"}')
