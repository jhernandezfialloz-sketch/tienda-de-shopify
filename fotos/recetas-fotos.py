import json
STYLE=("Photorealistic premium editorial photograph for a calm, high-end home wellness brand. "
"Use the EXACT product shown in the reference image(s): same shape, proportions, colors, materials and buttons; do not redesign, recolor or add parts. "
"ABSOLUTELY NO added text, letters, numbers, logos, watermarks, labels, captions, icons, arrows, infographics or graphic overlays anywhere in the image. "
"Lighting: soft natural window light from the left, long diffused shadows, warm late-morning tone. "
"Palette and props: warm cream (#F6F1EA) and sand tones, natural linen, honed travertine stone, light oak, eucalyptus sprigs, muted sage green (#5F6F55) accents, a subtle touch of terracotta. "
"Minimal, airy, uncluttered composition, refined spa mood, shallow depth of field, medium-format camera look, consistent color grading. "
"Show exactly ONE single unit of each product in the scene (the reference photos may show several views of the same item — never duplicate it). If people appear, never show a full face or eyes: only hands, skin, cheek, jawline, legs, back or shoulders. ")
E=["refs/espatula/1.jpg"]; M=["refs/masajeador/1.jpg","refs/masajeador/2.jpg","refs/masajeador/6.jpg"]; P=["refs/postura/1.jpg","refs/postura/8.jpg"]
SQ="1024x1024"; V="1024x1536"; W="1536x1024"
shots=[
# portada
("hero-espatula",V,E,"Vertical shot. The black ultrasonic facial spatula stands upright on a small honed travertine plinth, a few fine water droplets on its brushed steel tip, two eucalyptus sprigs lying beside the plinth, seamless warm cream plaster backdrop. Product in the lower-center 60% of the frame, calm empty space above."),
("hero-masajeador",SQ,M,"Square shot from a 45-degree angle. The handheld body massager rests on softly folded sand-colored linen, its three spare massage heads lined up neatly beside it, cream background, gentle shadows. Hide or neatly coil the power cord behind the linen."),
("hero-postura",SQ,P,"Square shot from a 45-degree angle. The black smart posture corrector neckband rests on a muted sage-green linen cloth next to a matte cream ceramic cup, warm cream background, gentle shadows."),
# rituales
("rit-espatula",SQ,E,"Square close-up lifestyle shot. A woman's hand glides the black facial spatula along her dewy cheek and jawline; only the lower cheek, jaw and hand are visible, no eyes. Fresh glowing skin, a cream towel on her shoulder, soft cream background on the right."),
("rit-espatula-detalle",SQ,E,"Square macro detail. The brushed stainless steel tip of the black facial spatula covered with fine water droplets and a faint mist, black glossy body softly out of focus, cream background, crisp highlights."),
("rit-masajeador",SQ,M,"Square lifestyle shot. A woman sitting on a bed with natural cream linen sheets uses the handheld massager on her thigh; only her leg, a cream towel and her hand are visible. Calm warm light, cord discreetly out of frame."),
("rit-masajeador-cabezales",SQ,M,"Square overhead flat lay. The massager and its interchangeable heads (black velvet cover, nodule head, mesh head, smooth head) arranged in a precise geometric composition on sand linen, generous spacing, soft shadows."),
("rit-postura",SQ,P,"Square lifestyle shot from behind. A person sits upright at a light oak desk with a laptop, wearing a soft sage-green t-shirt; the black posture corrector band rests around the back of the neck with its small pod on the upper back. Seen from behind at shoulder height, no face. Bright calm home office."),
("rit-postura-escritorio",SQ,P,"Square still life. The black posture corrector neckband lies on a light oak desk next to a closed silver laptop, a matte cream ceramic mug and a small potted plant, morning light raking across the desk."),
# comparar / garantia / cierre
("comparar-rincon",W,E+[M[1]]+[P[0]],"Wide horizontal shot. A serene home spa corner: a honed travertine bench against a warm cream plaster wall holds rolled cream towels, a ceramic vase with eucalyptus, and the three products arranged naturally (the black facial spatula, the white-and-lavender handheld massager with its cord neatly hidden, and the black posture corrector neckband). Soft morning light, plenty of breathing space."),
("garantia",SQ,E+[P[0]],"Square still life. A neatly folded cream linen towel on travertine with the black facial spatula and the black posture corrector neckband resting on top, a eucalyptus sprig, soft sunlight and leaf shadows. Feels calm and trustworthy."),
("cierre",W,E+[M[1]]+[P[0]],"Wide horizontal still life. A long low travertine bench against a warm cream plaster wall with soft eucalyptus leaf shadows. The black facial spatula and a eucalyptus sprig sit on the far left third, the white-and-lavender handheld massager (cord hidden) and the black posture corrector neckband sit on the far right third, all low in the frame. The entire center and upper half of the image is calm empty wall space."),
]
def gal(key,refs,items):
    for i,t in enumerate(items,1): shots.append((f"gal-{key}-{i}",SQ,refs,t))
gal("espatula",E,[
"Square catalog hero. The black facial spatula standing upright, front view, centered on a seamless warm cream backdrop with a soft natural shadow.",
"Square shot. The black facial spatula lying diagonally on a honed travertine block at a three-quarter angle, a eucalyptus sprig nearby.",
"Square macro detail of the control area and the brushed steel blade edge of the black facial spatula, shallow depth of field, cream background.",
"Square lifestyle. A hand holds the black facial spatula against the side of the neck and jawline, profile crop showing only neck, jaw and hand, glowing skin, cream background.",
"Square overhead flat lay of what is included: the black facial spatula, a clear protective silicone cap and a coiled white USB charging cable, neatly arranged on sand linen."])
gal("masajeador",M,[
"Square catalog hero. The handheld massager, side view, centered on a seamless warm cream backdrop with a soft shadow, cord neatly coiled behind it.",
"Square shot. The massager standing on its head on a honed travertine block at a three-quarter angle, eucalyptus sprig nearby.",
"Square macro detail of the massager head with the black velvet cover and the edge of the lavender grip, shallow depth of field.",
"Square lifestyle. The massager used on a calf, a woman's lower leg stretched on cream linen, only leg and hand visible.",
"Square overhead flat lay of what is included: the massager and its interchangeable heads arranged in a neat row on sand linen, cord coiled."])
gal("postura",P,[
"Square catalog hero. The black posture corrector neckband, front view, centered on a seamless warm cream backdrop with a soft shadow.",
"Square shot. The posture corrector resting on a honed travertine block at a three-quarter angle, eucalyptus sprig nearby.",
"Square macro detail of the small black pod with its glowing display and button, soft silicone texture, shallow depth of field.",
"Square lifestyle seen from behind and slightly to the side: a woman in a cream knit top stands tall, the black band resting around the back of her neck with the pod on her upper back; only shoulders, neck and hair visible, no face.",
"Square overhead flat lay of what is included: the posture corrector neckband and a coiled white USB charging cable on sand linen."])
with open('shots.json','w') as f: json.dump([{"name":n,"size":s,"refs":r,"prompt":STYLE+p} for n,s,r,p in shots],f,ensure_ascii=False,indent=1)
print(len(shots))
