import json
exec(open('shots.py').read().split('shots=[')[0])  # reuse STYLE, refs, sizes
PERSON=("The same woman in every photo: late 20s, warm light-tan skin, dark brown hair in a soft low bun, wearing an oatmeal-colored knit lounge top. "
"Keep her identity, hairstyle, clothing and the scene lighting perfectly consistent with the reference photo of her. ")
REF="out/uso-postura-2.jpg"
uso=[
("uso-postura-2",V,P,"Vertical 2:3 shot, seen from behind and slightly to the side at shoulder height. A woman sits at a light oak desk with an open laptop, visibly slouching forward with rounded shoulders; the black posture corrector band rests around the back of her neck with its pod on her upper back. Bright calm home office, morning window light. No face visible. "+PERSON),
("uso-postura-1",V,[REF]+P,"Vertical 2:3 shot from behind. The same woman stands in the same home office and gently places the black posture corrector band around the back of her neck with both hands. No face visible. "+PERSON),
("uso-postura-3",V,[REF]+P,"Vertical 2:3 shot from the same camera angle as the reference. The same woman now sits tall and upright at the desk, shoulders relaxed and back straight, the posture corrector band around her neck with the pod on her upper back. Calm, confident. No face visible. "+PERSON),
("uso-rostro-1",V,[REF]+E,"Vertical 2:3 close-up in a bright cream bathroom. The same woman gently splashes water on her cheek with cupped hands, crop from nose tip to shoulders so eyes are not visible, fresh dewy skin, the black facial spatula resting on the travertine sink edge. "+PERSON),
("uso-rostro-2",V,[REF]+E,"Vertical 2:3 close-up in the same bright cream bathroom. The same woman glides the black ultrasonic facial spatula along her damp cheek toward the ear, crop from nose tip to shoulders so eyes are not visible, faint fine mist at the steel tip. "+PERSON),
("uso-rostro-3",V,[REF]+E,"Vertical 2:3 close-up in the same bright cream bathroom. The same woman holds a small amber glass serum dropper near her cheek with one hand and the black facial spatula in the other, glowing skin, crop from nose tip to shoulders so eyes are not visible. "+PERSON),
("uso-cuerpo-1",V,[REF]+M,"Vertical 2:3 shot in a bright bedroom with cream linen sheets. The same woman sits on the bed and clicks a massage head onto the handheld massager, the other heads lined up on the linen beside her; framed from shoulders down, no face. Cord neatly out of the way. "+PERSON),
("uso-cuerpo-2",V,[REF]+M,"Vertical 2:3 shot in the same bedroom. The same woman, sitting on the bed in comfortable shorts, massages her thigh with the handheld massager in slow circles; framed from chest down, no face. Cord discreet. "+PERSON),
("uso-cuerpo-3",V,[REF]+M,"Vertical 2:3 shot in the same bedroom. The same woman leans back relaxed against cream pillows holding a ceramic cup of tea, legs stretched under a light linen throw, the massager resting on the bed beside her; framed from the chin down, no eyes. Peaceful mood. "+PERSON),
]
json.dump([{"name":n,"size":s,"refs":r,"prompt":STYLE+p} for n,s,r,p in uso],open('shots_uso.json','w'),ensure_ascii=False,indent=1)
print(len(uso))
