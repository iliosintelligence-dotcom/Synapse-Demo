# Zyn 3D

Source for the Zyn character renders (three.js, MeshPhysicalMaterial with transmission and iridescence).

    npm i three playwright-core
    node render.mjs all 640 ss=2      # renders every state to out/<state>.png (true alpha, via white/black matting)
    python pack.py                    # crops to one shared box and writes WebP to pack/

`states.js` holds the 36 states (eyes only, no mouth), `props.js` the 3D props, `zyn.js` the model.
render.mjs expects Chrome at C:\Program Files\Google\Chrome\Application\chrome.exe.
