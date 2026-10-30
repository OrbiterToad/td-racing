"""Build original, strictly overhead SVG scenery for APEX. No dependencies."""
from pathlib import Path
import math
import random

ROOT = Path(__file__).resolve().parents[1] / 'assets' / 'scenery'
ROOT.mkdir(parents=True, exist_ok=True)


def save(name, content, width=128, height=128):
    (ROOT / (name + '.svg')).write_text(
        f'<svg xmlns="http://www.w3.org/2000/svg" width="{width}" height="{height}" viewBox="0 0 {width} {height}">\n{content}\n</svg>\n'
    )


def star(radius, inner, count=20, center=64):
    return ' '.join(f'{center + math.cos(i * math.pi * 2 / count) * (radius if i % 2 == 0 else inner):.2f},{center + math.sin(i * math.pi * 2 / count) * (radius if i % 2 == 0 else inner):.2f}' for i in range(count))


# Layered crowns, viewed straight down; no trunks drawn as side elevations.
canopy = 'M21 49Q8 31 29 22Q39 6 56 18Q72 6 85 19Q108 12 111 36Q126 48 113 63Q127 86 105 96Q99 120 77 110Q62 125 46 110Q23 118 19 97Q1 84 15 67Q8 54 21 49Z'
for name, palette, seed in [
    ('tree-oak', ['#3c674b', '#557e53', '#74945e', '#8ca16c'], 11),
    ('tree-birch', ['#57764e', '#7a965e', '#97ab72', '#afbd87'], 17),
    ('tree-elm', ['#3f654a', '#64855a', '#809764', '#9aab77'], 24),
    ('tree-jungle', ['#244f3d', '#39724a', '#528852', '#70a068'], 29),
]:
    rng = random.Random(seed)
    art = f'<path d="{canopy}" transform="translate(4 5)" fill="#233b2d" opacity=".24"/><path d="{canopy}" fill="{palette[0]}" stroke="#32553c" stroke-width="2"/>'
    for index in range(13):
        angle = index * math.pi * 2 / 13
        x, y = 64 + math.cos(angle) * 27, 64 + math.sin(angle) * 27
        art += f'<ellipse cx="{x:.1f}" cy="{y:.1f}" rx="{19+rng.random()*8:.1f}" ry="{16+rng.random()*7:.1f}" fill="{palette[1 + index % 2]}"/>'
    art += f'<path d="M36 48Q44 34 60 38M68 29Q82 26 91 39M79 83Q92 85 96 72" fill="none" stroke="{palette[3]}" stroke-width="4" stroke-linecap="round"/>'
    art += f'<ellipse cx="58" cy="57" rx="25" ry="22" fill="{palette[2]}"/><ellipse cx="52" cy="49" rx="13" ry="10" fill="{palette[3]}" opacity=".55"/>'
    if name == 'tree-birch':
        art += '<path d="M64 77L56 60M64 77L77 65" stroke="#e0dbb8" stroke-width="3" stroke-linecap="round"/>'
    if name == 'tree-jungle':
        art += '<g fill="#b4bb71"><circle cx="33" cy="76" r="2"/><circle cx="91" cy="50" r="2"/><circle cx="75" cy="92" r="2"/></g>'
    save(name, art)

for name, snow in [('tree-pine', False), ('tree-pine-snow', True)]:
    art = f'<polygon points="{star(54, 29)}" transform="translate(4 5)" fill="#24443b" opacity=".23"/>'
    for radius, inner, color in [(54, 28, '#355e4f'), (43, 20, '#527b5f'), (30, 13, '#71916e')]:
        art += f'<polygon points="{star(radius,inner)}" fill="{color}" stroke="#385d47" stroke-width="1.5"/>'
    if snow:
        art += f'<polygon points="{star(46,22)}" fill="#dbe8d8"/><polygon points="{star(32,14)}" fill="#f3f5e6"/>'
        art += '<path d="M57 39L61 53L50 49M76 56L68 62L80 70M58 79L62 69" fill="none" stroke="#aabfb0" stroke-width="2"/>'
    else:
        art += '<path d="M64 26V100M32 46L96 81M95 45L31 82" stroke="#99aa77" stroke-opacity=".48" stroke-width="2"/>'
    art += '<circle cx="64" cy="64" r="6" fill="#a4b68b"/>'
    save(name, art)

for name, count, base in [('tree-palm', 8, '#437d50'), ('tree-fan-palm', 10, '#548951')]:
    art = '<ellipse cx="68" cy="69" rx="52" ry="45" fill="#254832" opacity=".20"/>'
    for i in range(count):
        art += f'<g transform="rotate({i*360/count:.1f} 64 64)"><path d="M64 64Q84 32 119 57Q96 66 64 64Z" fill="{base if i%2 else "#719c5e"}" stroke="#3e7048" stroke-width="1"/><path d="M64 64Q85 48 113 57" fill="none" stroke="#a2b976" stroke-width="2"/>'
        for k in range(4):
            art += f'<path d="M{77+k*7} {55-k%2*2}L{83+k*7} {44+k*2}" stroke="#a5b879" stroke-opacity=".45" stroke-width="1"/>'
        art += '</g>'
    art += '<circle cx="64" cy="64" r="7" fill="#8d8c58"/><circle cx="61" cy="62" r="3" fill="#d2bf7c"/>'
    save(name, art)

save('tree-acacia', '<ellipse cx="68" cy="70" rx="55" ry="38" fill="#765e3a" opacity=".22"/><path d="M14 43Q19 21 42 27Q59 13 76 25Q105 18 115 45Q127 65 108 85Q85 106 62 95Q38 106 17 85Q2 66 14 43Z" fill="#6f8050" stroke="#637449" stroke-width="2"/><g fill="#8e9e62"><ellipse cx="37" cy="50" rx="25" ry="20"/><ellipse cx="81" cy="45" rx="28" ry="20"/><ellipse cx="88" cy="75" rx="24" ry="19"/><ellipse cx="43" cy="79" rx="25" ry="17"/></g><path d="M32 45Q44 33 54 40M76 35Q92 33 102 46" fill="none" stroke="#b1bb77" stroke-width="4" stroke-linecap="round"/><path d="M56 66L72 62L84 72M57 66L46 78" fill="none" stroke="#ae9d68" stroke-width="3"/>')
save('tree-cactus', '<g stroke-linecap="round" fill="none"><path d="M66 104V35M65 68H33V44M65 80H98V60" stroke="#735c3b" stroke-opacity=".22" stroke-width="27" transform="translate(4 5)"/><path d="M64 103V31M64 66H30V42M64 79H97V54" stroke="#4f7752" stroke-width="24"/><path d="M60 101V32M60 62H30V42M63 75H96V55" stroke="#7e9b5d" stroke-width="12"/><path d="M63 99V33M33 59V45M94 72V57" stroke="#b3bf7e" stroke-width="2"/></g><g fill="#cfcca0"><circle cx="52" cy="43" r="1.5"/><circle cx="73" cy="47" r="1.5"/><circle cx="53" cy="87" r="1.5"/><circle cx="75" cy="92" r="1.5"/></g>')

# Roof planes, gutters, skylights, chimneys and small porches all fit the box.
for name, roof, wall, snow, wooden in [
    ('house-terracotta', '#c77e59', '#f0dec0', False, False),
    ('house-sandstone', '#c1a477', '#edddbd', False, False),
    ('house-slate', '#718989', '#e0e2c9', False, False),
    ('cottage-wood', '#8a8560', '#bfaa7e', False, True),
    ('cottage-snow', '#718879', '#d1c9a7', True, True),
    ('hut-jungle', '#647f58', '#c0ad7b', False, True),
]:
    art = f'<rect x="14" y="18" width="106" height="94" rx="6" fill="#344b35" opacity=".20"/><rect x="9" y="11" width="106" height="96" rx="5" fill="{wall}" stroke="#a5a287" stroke-width="2"/><rect x="13" y="15" width="98" height="82" rx="3" fill="{roof}"/>'
    for y in range(23, 94, 9):
        art += f'<path d="M17 {y}H107" stroke="{"#6c7350" if wooden else "#8f6550"}" stroke-opacity=".35" stroke-width="1.5"/>'
    art += '<path d="M62 15V97" stroke="#ede0b8" stroke-width="4"/><path d="M64 15V97" stroke="#7c755b" stroke-width="1.5"/>'
    art += '<rect x="29" y="35" width="22" height="19" rx="2" fill="#d7d8bb" stroke="#8b927d" stroke-width="2"/><rect x="33" y="39" width="14" height="11" fill="#9cbcbc"/><path d="M40 39V50" stroke="#e9e5c8" stroke-width="1.5"/><rect x="84" y="24" width="13" height="19" rx="1" fill="#d0bd95"/><rect x="87" y="27" width="7" height="12" fill="#68776a"/>'
    art += f'<rect x="30" y="98" width="64" height="18" rx="3" fill="{wall}" stroke="#b2ab89" stroke-width="2"/><path d="M37 104H87M37 111H87" stroke="#c4b393" stroke-width="2"/><rect x="14" y="100" width="10" height="15" rx="2" fill="#73895e"/>'
    if snow:
        art += '<path d="M13 15H111V34L99 39L85 31L72 39L62 31L49 37L34 30L18 36L13 31Z" fill="#eff4e4"/><path d="M14 84L25 90L43 84L62 91L82 86L95 92L110 87V97H14Z" fill="#e2eddb"/>'
    if name == 'hut-jungle':
        art += '<path d="M23 66L37 73M79 56L100 65M21 79L42 88" stroke="#9aaa6c" stroke-width="3"/>'
    save(name, art)

# Distinct flat-roof adobe and round thatched-hut footprints complement the gables.
save('house-sandstone', '<rect x="15" y="18" width="104" height="96" rx="5" fill="#504b33" opacity=".20"/><path d="M9 10H113V76H83V109H9Z" fill="#edddbb" stroke="#a89e7b" stroke-width="2"/><path d="M17 18H105V67H75V101H17Z" fill="#b9a17b" stroke="#d6c69c" stroke-width="4"/><path d="M24 28H98M24 41H98M24 54H98M24 68H67M24 81H67M24 94H67" stroke="#cfba90" stroke-width="2"/><circle cx="88" cy="37" r="12" fill="#d4ccb0" stroke="#8f9b85" stroke-width="2"/><circle cx="88" cy="37" r="5" fill="#92aaa2"/><rect x="31" y="40" width="27" height="20" fill="#a8bfb0" stroke="#e6deba" stroke-width="2"/><rect x="81" y="81" width="27" height="27" rx="3" fill="#d5c59a"/><path d="M85 88H104M85 96H104" stroke="#a89a75" stroke-width="2"/><rect x="18" y="109" width="55" height="11" rx="2" fill="#c5ad80"/>')
save('hut-jungle', '<rect x="29" y="23" width="75" height="94" rx="5" fill="#34492d" opacity=".25"/><rect x="24" y="18" width="75" height="94" rx="4" fill="#b19b69" stroke="#d4be87" stroke-width="2"/><path d="M30 28H93M30 42H93M30 56H93M30 70H93M30 84H93M30 98H93" stroke="#796e49" stroke-width="2"/><circle cx="66" cy="61" r="48" fill="#274e32" opacity=".22"/><circle cx="62" cy="56" r="47" fill="#778357" stroke="#4f6843" stroke-width="3"/><circle cx="62" cy="56" r="37" fill="#94a36b"/><path d="M62 12V100M18 56H106M30 25L94 87M30 87L94 25M43 15L81 97M21 37L103 75M21 75L103 37M43 97L81 15" stroke="#bdba7c" stroke-width="2"/><circle cx="62" cy="56" r="12" fill="#62774a" stroke="#c5c28b" stroke-width="3"/><rect x="37" y="111" width="49" height="10" rx="2" fill="#c0ab75"/><path d="M43 115H81" stroke="#e2ce95" stroke-width="2"/>')

save('house-modern', '<rect x="14" y="16" width="106" height="98" rx="5" fill="#294334" opacity=".20"/><rect x="8" y="9" width="106" height="96" rx="4" fill="#eee7cc" stroke="#a5ad98" stroke-width="2"/><path d="M15 16H107V64H72V98H15Z" fill="#7f9790"/><path d="M20 21H102V58H67V92H20Z" fill="none" stroke="#b9c8b4" stroke-width="3"/><g fill="#557d89" stroke="#a9c4c1" stroke-width="1.5"><rect x="26" y="32" width="17" height="22"/><rect x="47" y="32" width="17" height="22"/><rect x="68" y="32" width="17" height="22"/></g><rect x="79" y="74" width="25" height="21" fill="#d0d8bc"/><path d="M83 80H101M83 85H101M83 90H101" stroke="#899c84" stroke-width="2"/><rect x="28" y="104" width="66" height="13" rx="2" fill="#c0b28c"/><rect x="12" y="108" width="11" height="9" rx="2" fill="#738e62"/>')

for name, shape, color in [('office-lowrise', 'square', '#697f80'), ('office-courtyard', 'court', '#7e8c86'), ('warehouse', 'warehouse', '#7e897b')]:
    art = f'<rect x="16" y="17" width="136" height="132" rx="5" fill="#2b4038" opacity=".20"/><rect x="9" y="9" width="136" height="132" rx="3" fill="#d4d9c8" stroke="#9cafa3" stroke-width="2"/><rect x="15" y="15" width="124" height="120" fill="{color}"/><rect x="22" y="22" width="110" height="106" fill="none" stroke="#a9beb1" stroke-width="3"/>'
    if shape == 'court':
        art += '<rect x="50" y="50" width="55" height="58" rx="4" fill="#c1cfad"/><path d="M77 52V105M53 79H102" stroke="#e0dcc2" stroke-width="4"/><circle cx="77" cy="79" r="11" fill="#7ca8a2"/>'
    elif shape == 'warehouse':
        art += '<path d="M20 44H134M20 67H134M20 90H134M20 113H134" stroke="#b9c6af" stroke-opacity=".55" stroke-width="2"/><rect x="49" y="35" width="56" height="15" fill="#b0d1cc"/><rect x="49" y="73" width="56" height="15" fill="#b0d1cc"/>'
    else:
        art += '<rect x="41" y="65" width="68" height="33" fill="#9fbdb9" stroke="#c5d8ca" stroke-width="3"/><path d="M58 66V96M76 66V96M93 66V96" stroke="#688e91" stroke-width="2"/>'
    for x in [32, 67, 102]:
        art += f'<rect x="{x}" y="28" width="24" height="23" rx="2" fill="#c7d2c0"/><circle cx="{x+12}" cy="39.5" r="7" fill="#7b9489"/><path d="M{x+7} 39.5H{x+17}M{x+12} 34.5V44.5" stroke="#adc0aa" stroke-width="1.5"/>'
    art += '<path d="M127 98V119H105" fill="none" stroke="#d2d9c5" stroke-width="4"/>'
    save(name, art, 160, 160)

# Garage modules face down the SVG; the game rotates them towards the service lane.
for theme, roof, wall, trim in [
    ('cream', '#aab39a', '#e9e0bf', '#bd9065'),
    ('industrial', '#7e9190', '#cdd1bd', '#cb8268'),
    ('alpine', '#a8bfc0', '#e4e8d6', '#77a3ae'),
    ('coastal', '#ca8967', '#f2e2c0', '#72aeb8'),
    ('jungle', '#738d6d', '#d5d3af', '#a3b875'),
    ('city', '#81908b', '#dadfcf', '#e0b773'),
]:
    art = f'<rect x="12" y="17" width="111" height="91" rx="4" fill="#2b4033" opacity=".20"/><rect x="7" y="10" width="112" height="91" rx="3" fill="{wall}" stroke="#a8ad92" stroke-width="2"/><rect x="13" y="15" width="100" height="73" rx="2" fill="{roof}"/>'
    for x in range(22, 111, 11):
        art += f'<path d="M{x} 18V84" stroke="{wall}" stroke-opacity=".28" stroke-width="1.5"/>'
    art += '<rect x="30" y="31" width="65" height="22" rx="2" fill="#cadbd1" stroke="#718f88" stroke-width="2"/><path d="M46 32V52M62 32V52M78 32V52" stroke="#8baba6" stroke-width="2"/><rect x="91" y="63" width="16" height="16" rx="2" fill="#d5dbbf"/><circle cx="99" cy="71" r="5" fill="#7e9282"/>'
    art += f'<rect x="10" y="89" width="106" height="20" rx="2" fill="{trim}" stroke="#f1e7c8" stroke-width="2"/><path d="M20 92V107M40 92V107M60 92V107M80 92V107M100 92V107" stroke="{wall}" stroke-opacity=".7" stroke-width="3"/><rect x="26" y="110" width="73" height="10" rx="2" fill="#bcb496"/><path d="M34 113H91M34 117H91" stroke="#e1d7b7" stroke-width="1.5"/>'
    if theme == 'alpine':
        art += '<path d="M13 15H113V28L103 32L90 25L77 34L62 26L50 33L38 27L23 34L13 28Z" fill="#f3f6e8"/>'
    save('garage-' + theme, art, 128, 128)

for name, roof in [('control-room', '#6b9194'), ('control-room-snow', '#cbdcd4')]:
    art = f'<rect x="14" y="18" width="108" height="92" rx="5" fill="#304539" opacity=".22"/><rect x="8" y="11" width="108" height="94" rx="3" fill="#e0ddbc" stroke="#9cae9c" stroke-width="2"/><rect x="14" y="17" width="96" height="78" fill="{roof}"/><path d="M21 24H103V88H21Z" fill="none" stroke="#c3d8cb" stroke-width="3"/><rect x="31" y="39" width="58" height="28" fill="#b7d9d4" stroke="#668d8f" stroke-width="2"/><path d="M45 40V66M60 40V66M75 40V66" stroke="#e3e9d4" stroke-width="2"/><circle cx="94" cy="29" r="12" fill="#dbe3ca" stroke="#819f94" stroke-width="2"/><path d="M88 34L101 23" stroke="#70928e" stroke-width="2"/><rect x="16" y="99" width="92" height="14" rx="2" fill="#708783"/>'
    for x in range(18, 108, 12):
        art += f'<rect x="{x}" y="100" width="6" height="6" fill="#eee9cd"/><rect x="{x+6}" y="106" width="6" height="6" fill="#eee9cd"/>'
    art += '<rect x="43" y="114" width="38" height="7" rx="2" fill="#b8ad87"/>'
    save(name, art)

for name, color in [('service-tent-red', '#c37f69'), ('service-tent-blue', '#719fa9'), ('service-tent-sand', '#c1ad7c')]:
    save(name, f'<rect x="12" y="22" width="108" height="88" rx="4" fill="#304635" opacity=".20"/><rect x="7" y="16" width="108" height="88" rx="5" fill="{color}" stroke="#eee2bd" stroke-width="3"/><path d="M9 18L113 102M113 18L9 102" stroke="#f1e5c9" stroke-width="2"/><path d="M61 18V102M9 60H113" stroke="#f3e9ce" stroke-opacity=".45" stroke-width="2"/><circle cx="61" cy="60" r="5" fill="#ece2c4"/><g fill="#e5dfc7"><circle cx="8" cy="17" r="4"/><circle cx="114" cy="17" r="4"/><circle cx="8" cy="103" r="4"/><circle cx="114" cy="103" r="4"/></g>')

art = '<rect x="11" y="19" width="110" height="90" rx="5" fill="#24372d" opacity=".20"/><rect x="8" y="14" width="108" height="90" rx="3" fill="#a9af8b" stroke="#6f8066" stroke-width="3"/>'
for x in [28, 62, 96]:
    for y in [37, 77]:
        art += f'<circle cx="{x}" cy="{y}" r="16" fill="#293a32" stroke="#61715b" stroke-width="2"/><circle cx="{x}" cy="{y}" r="7" fill="#9da487"/><path d="M{x-10} {y-8}L{x-6} {y-11}M{x+8} {y+7}L{x+11} {y+3}" stroke="#889479" stroke-width="2"/>'
save('tyre-rack', art)
save('fuel-store', '<rect x="13" y="18" width="106" height="95" rx="4" fill="#344634" opacity=".22"/><rect x="8" y="12" width="106" height="95" rx="3" fill="#b3ac87" stroke="#8d9576" stroke-width="2"/><path d="M14 22H108M14 42H108M14 62H108M14 82H108M14 102H108" stroke="#d6c797" stroke-width="2"/><g fill="#b27f5b" stroke="#e0c49a" stroke-width="3"><circle cx="34" cy="38" r="18"/><circle cx="86" cy="38" r="18"/><circle cx="34" cy="83" r="18"/><circle cx="86" cy="83" r="18"/></g><g fill="#d8c49a"><circle cx="28" cy="32" r="4"/><circle cx="80" cy="32" r="4"/><circle cx="28" cy="77" r="4"/><circle cx="80" cy="77" r="4"/></g>')
save('wood-crates', '<rect x="15" y="21" width="103" height="91" rx="3" fill="#3b4b32" opacity=".20"/><g fill="#bd9e6e" stroke="#ead6a4" stroke-width="3"><rect x="10" y="15" width="49" height="49" rx="2"/><rect x="64" y="15" width="49" height="49" rx="2"/><rect x="37" y="69" width="49" height="45" rx="2"/></g><path d="M14 19L55 60M55 19L14 60M68 19L109 60M109 19L68 60M41 73L82 110M82 73L41 110" stroke="#8b7a55" stroke-width="3"/>')
save('picnic-table', '<ellipse cx="67" cy="69" rx="54" ry="43" fill="#405239" opacity=".15"/><g fill="#ba9c6d" stroke="#e0cb9e" stroke-width="2"><rect x="21" y="21" width="85" height="17" rx="3"/><rect x="21" y="89" width="85" height="17" rx="3"/><rect x="14" y="43" width="99" height="40" rx="4"/></g><path d="M19 53H108M19 63H108M19 73H108" stroke="#8b7c54" stroke-width="2"/><rect x="51" y="52" width="23" height="20" rx="3" fill="#dcd8ae"/><circle cx="62" cy="62" r="6" fill="#b2c58c"/>')
save('park-bench', '<rect x="14" y="46" width="108" height="48" rx="4" fill="#344c34" opacity=".18"/><rect x="9" y="39" width="108" height="45" rx="4" fill="#bba371" stroke="#e2d1a3" stroke-width="2"/><path d="M14 49H111M14 59H111M14 69H111M14 79H111" stroke="#8a7d53" stroke-width="3"/><path d="M22 33V91M102 33V91" stroke="#62765b" stroke-width="7" stroke-linecap="round"/>')
print(f'Built {len(list(ROOT.glob("*.svg")))} scenery assets in {ROOT}')
