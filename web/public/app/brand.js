/* Synapse brand motion: the logo, the wordmark, the loading screen.

   The mark and the wordmark used to be JPEG photographs of the logo, which can only
   be moved as one flat rectangle. They are vectors now (traced from the 1600px
   lockup, images/brand/synapse-mark.svg and synapse-wordmark.svg), so each part
   can move on its own and the colour comes from the page, light or dark, with no
   white box behind it.

   WHAT MOVES, and why it feels the way it does
     arrival   the three parts of the mark snap together: the spine rises, the S drops
               in, the arch springs up under it. A spring, not an ease: it overshoots,
               settles, and is done in under a second.
     hover     the mark squashes and stretches like jelly and its parts pop apart a
               few pixels and spring back; the letters of the word ripple, one after
               another. Hover again and it goes again.
     press     it squashes under the finger the moment you touch it, then springs
               back with a small burst of sparks. Every press pays you something.
     idle      the parts drift out of phase, barely: it is alive, never busy. Only
               while it is on screen and the tab is open.
     scroll    when the landing page's bar turns solid the mark hops.
     loading   the parts take turns hopping, so waiting has a pulse.
   All of it is transform and opacity only (the compositor does it, nothing repaints),
   and none of it runs for anyone who has asked their device for less motion.

   Pages just include this file. It finds the old logo images and swaps them in,
   keeping their size, so no page markup had to change. */
(function () {
  'use strict';
  if (window.SynBrand) return;

  var PATHS = {"mark":{"vb":[1580,2210],"d":"M 563.3 30.1 L 549.5 31.7 540.7 36.3 C 535.9 38.9, 531.1 41, 530 41 C 520.9 41, 486.8 74.3, 480.8 89.1 C 479.6 92.1, 477.4 96.3, 476 98.5 C 471.5 105.2, 471.2 106.1, 468.4 123.1 L 465.7 139.5 466.5 219 C 466.9 262.7, 467.2 306.4, 467.2 316 C 467.1 325.6, 466.7 363.9, 466.4 401 L 465.8 468.5 468.5 484.5 C 471.2 500.4, 472.3 503.7, 476.5 509.5 C 477.7 511.2, 479.7 515.1, 481 518.3 C 488.3 536.8, 521.4 565.8, 538.9 569 C 542.4 569.6, 548.7 571.9, 552.9 574 C 559.1 577.2, 562.2 578.1, 569.5 578.9 C 575.3 579.6, 708.7 579.9, 946.2 580 C 1212.5 580, 1314.6 580.3, 1316.4 581.1 C 1320.8 583.1, 1321 584.9, 1321 625.1 C 1321 668.1, 1321 668.1, 1314.1 670 C 1311.5 670.7, 1146.7 670.9, 784.8 670.8 L 259.4 670.5 256.7 668.7 C 255.2 667.8, 253.8 665.9, 253.4 664.6 C 253.1 663.4, 252.8 545.1, 252.7 401.9 L 252.5 141.5 250.7 128.2 C 246.5 96.9, 240 83.8, 218 62.1 C 206.2 50.5, 195.8 43.4, 186.5 40.4 C 182.7 39.2, 176.1 36.6, 172 34.7 C 161.4 29.6, 152.1 29, 88.7 29 C 34 29, 31.6 29.2, 28.3 33.1 C 26.7 35.1, 26.3 2068.4, 27.9 2086 C 29.3 2100.9, 32 2110.6, 36.9 2117.8 C 39 2120.9, 41.5 2125.1, 42.5 2127 C 49.6 2141.1, 69.2 2159.6, 86 2168 C 102.8 2176.5, 106.9 2178.1, 115 2179.2 C 121.2 2180, 187.4 2180.3, 363 2180.3 L 602.5 2180.2 612 2178 C 621.3 2175.8, 635.8 2169.5, 642.2 2164.8 C 644 2163.5, 647.8 2161.2, 650.6 2159.5 C 658.6 2154.9, 676.2 2135.7, 679.9 2127.6 C 681.5 2123.9, 683.8 2119.6, 685 2118 C 686.1 2116.4, 688.6 2110.7, 690.4 2105.3 C 692.3 2099.9, 694.6 2093.5, 695.7 2091 L 697.5 2086.5 697.7 1821 C 697.9 1675, 698 1554.4, 698 1553.2 C 698 1551.8, 699.5 1549.3, 701.4 1547.4 L 704.8 1544 1009.3 1544 L 1313.7 1544 1316.3 1546 C 1321.1 1549.8, 1321 1542.1, 1321 1815 C 1321 2086.8, 1321 2083, 1325.5 2092.1 C 1326.9 2094.7, 1328.9 2100.4, 1330.1 2104.7 C 1337.6 2132.2, 1361.9 2158.1, 1393.3 2172.1 C 1409.6 2179.4, 1407.2 2179.2, 1479.5 2179.7 L 1544.5 2180.2 1547.3 2177.6 C 1548.8 2176.2, 1550 2174.3, 1550 2173.3 C 1550 2172.3, 1550.2 1978.9, 1550.5 1743.5 C 1550.8 1508.1, 1551.3 1295.5, 1551.5 1271 C 1552.1 1206.1, 1550.6 1184.9, 1544.5 1175 C 1542.7 1171.9, 1540.2 1167.2, 1539.1 1164.5 C 1531 1144, 1504.9 1117, 1487.7 1111.1 C 1484.8 1110.1, 1479.8 1107.9, 1476.5 1106.3 C 1460.5 1098.3, 1493.7 1098.8, 1010.5 1098.8 C 538.5 1098.8, 558.8 1098.5, 546.5 1104.5 C 542.7 1106.3, 536.6 1108.9, 533 1110.2 C 515.6 1116.5, 486.6 1145.1, 481 1161.5 C 480 1164.5, 477.5 1169.8, 475.6 1173.2 C 468.6 1185.7, 467 1205.8, 467.6 1269 C 467.9 1294, 468.3 1456.5, 468.6 1630.1 L 469.1 1945.7 467 1948.3 C 463.3 1953, 461.3 1953.1, 358 1952.8 L 261.5 1952.5 258.3 1950.7 C 256.5 1949.8, 254.6 1948.1, 254 1947 C 252.6 1944.3, 252.6 905.7, 254 903 C 254.6 901.9, 256.5 900.2, 258.3 899.3 L 261.5 897.5 786.5 897.7 C 1075.3 897.8, 1342.3 898, 1380 898.2 L 1448.5 898.5 1456 896.3 C 1460.1 895, 1468.3 892.9, 1474.1 891.5 C 1482.6 889.4, 1485.6 888.2, 1488.6 885.6 C 1490.8 883.8, 1494.3 881.4, 1496.6 880.2 C 1513.6 871.5, 1533.1 849.6, 1539 832.5 C 1540.1 829.2, 1542.6 824, 1544.4 821 C 1551 810.2, 1551.9 796.7, 1551.3 719.5 C 1550.6 632.2, 1550.6 597.3, 1551.5 532.5 C 1552.4 456.3, 1551 435.8, 1544 426 C 1542.9 424.4, 1540.9 420.3, 1539.6 416.8 C 1532.8 398.9, 1515 377.7, 1499.2 368.8 C 1486 361.4, 1467.4 352.8, 1462 351.8 C 1458.1 351, 1345.6 350.8, 1082 351 L 707.5 351.2 703.3 349.5 C 696 346.6, 696 346.5, 696 303.1 L 696 265 698.9 261.8 L 701.8 258.5 1076.7 258 L 1451.5 257.5 1465.4 252.7 C 1473.1 250.1, 1481.4 246.7, 1483.9 245.1 C 1486.4 243.5, 1490.5 241.4, 1492.9 240.4 C 1508 234.4, 1539 199.6, 1539 188.6 C 1539 187.8, 1541 183.3, 1543.4 178.7 C 1549.7 166.9, 1549.8 164.5, 1550.1 95.2 L 1550.3 35 1548 32.5 C 1546.7 31.1, 1544.3 29.8, 1542.6 29.5 C 1540.9 29.3, 1323 28.9, 1058.3 28.8 L 577.1 28.5 563.3 30.1","cutX":249,"cutY":1000},"word":{"vb":[7880,570],"letters":[{"d":"M 237 28.1 C 227.4 28.6, 208.9 29.4, 196 29.8 L 172.5 30.7 163 34.5 C 157.2 36.7, 148.4 39.1, 140.5 40.6 C 123.4 43.7, 100.4 51.1, 94.8 55.4 C 92.4 57.2, 88.4 59.9, 85.8 61.4 C 79.1 65.3, 59.1 84.2, 55 90.5 C 51 96.6, 46.5 103.7, 43.3 108.8 C 42.1 110.8, 40.6 115.3, 40 118.9 C 39.3 122.5, 37.7 129.8, 36.4 135 C 32.3 151.9, 31.5 160.1, 31.5 188.5 L 31.5 215.5 34.7 226.5 C 36.4 232.6, 38.4 240.9, 39 245 C 40.6 254.6, 41.2 256.1, 45.4 260.8 C 47.3 262.9, 49.8 266.6, 50.8 269.1 C 53.7 275.8, 70.8 291.8, 82.1 298.4 C 84.6 299.8, 87.5 301.9, 88.5 303 C 93.4 308.4, 112.6 315.6, 130.6 318.9 C 138.1 320.2, 144.6 322.2, 151.1 325 C 159.2 328.6, 162.2 329.4, 173 330.6 C 187.8 332.2, 205.3 334.6, 213 336 C 220.3 337.3, 249.1 340, 256 340 C 259.1 340, 268.3 341.2, 276.5 342.6 C 306.6 347.7, 315.9 348.8, 336.5 349.4 C 348.1 349.8, 367 350.7, 378.5 351.5 C 487.4 359.1, 487.7 359.2, 491.1 374 C 493.8 385.7, 484.8 392, 462.6 394 C 457.2 394.5, 451.1 395.5, 449.1 396.2 C 443.1 398.2, 298.4 397.7, 286.6 395.6 C 281.7 394.7, 275.1 394, 271.9 394 C 268.7 394, 263.1 393.4, 259.3 392.6 C 255.6 391.9, 248.4 390.9, 243.3 390.6 C 226.1 389.4, 215.9 383.1, 213 371.9 C 212.4 369.5, 211.7 366.7, 211.4 365.8 C 211.1 364.8, 209.7 363.1, 208.3 362 L 205.7 360 124.8 360 L 43.8 360 40.8 363.1 L 37.7 366.2 38.4 385.8 C 38.7 396.6, 39.5 411.1, 40 418 L 40.9 430.5 45.4 439 C 47.9 443.9, 50.5 450.8, 51.5 455.3 C 54.8 470.1, 74 492.8, 88.7 499.1 C 91 500.1, 95.2 502.7, 98 504.9 C 100.8 507.1, 105 509.4, 107.3 510 C 109.6 510.6, 116.7 512.6, 123 514.5 C 129.3 516.4, 139.2 518.7, 145 519.6 C 150.8 520.5, 160.5 522.8, 166.5 524.7 C 172.8 526.7, 181.4 528.5, 186.5 529 C 222.2 532.6, 370.6 534, 458 531.6 C 528.3 529.7, 525 530, 556 521.9 C 560.1 520.8, 567.1 519.5, 571.5 519 C 581.5 517.8, 588 516.5, 599.5 513.5 C 604.5 512.2, 611 510.6, 614.1 510 C 617.7 509.3, 622.1 507.4, 626.4 504.5 C 630.1 502.1, 635.3 499.4, 638 498.5 C 646.5 495.7, 667.2 476.2, 669.9 468.4 C 670.6 466.3, 672.7 462, 674.6 459 C 685.2 441.3, 688.9 421.3, 688.9 381 C 688.9 336.8, 685.5 317.1, 674.6 299 C 672.8 296, 670.3 291.3, 669 288.7 C 667.4 285.3, 665.2 282.8, 661.1 279.9 C 658 277.7, 653 274.1, 650 271.9 C 641.6 265.7, 636.3 262.8, 628.9 260.4 C 625.2 259.2, 620.1 256.8, 617.6 255 C 614.6 253, 610.2 251.3, 604.8 250.1 C 600.2 249.1, 592.9 247.3, 588.5 246.1 C 580.5 244.1, 564.9 242, 542.7 240 C 533.9 239.2, 528.3 238.1, 520.3 235.4 C 508.7 231.5, 506.7 231.3, 463 228.5 C 449.5 227.6, 434.5 226.5, 429.5 226.1 C 406.5 223.9, 381.9 222, 364.5 221 C 344.3 219.9, 315.4 216.1, 303 213.1 C 297.7 211.8, 289.7 211, 275.5 210.6 C 228.1 209, 216.1 206.7, 210.3 198.1 C 202.2 186, 213.6 173.5, 235 171.1 C 274 166.5, 437.2 167.6, 455.3 172.4 C 473.6 177.4, 486.5 186.6, 491.5 198.4 C 495.9 208.8, 488.4 208, 581.3 208 C 630.1 208, 662.9 207.6, 664.4 207 C 670.7 204.6, 671.8 192.9, 669.2 155.9 L 668.3 143.2 664.7 137.4 C 662.7 134.1, 660.4 129, 659.5 125.9 C 652.1 99.7, 625.9 69.1, 604 61.2 C 600.4 59.9, 594.6 57.2, 591 55 C 580.7 49, 560.6 43.3, 540 40.6 C 533.1 39.8, 525.7 38.1, 521.5 36.5 C 507.8 31.2, 506.4 31.1, 458 29 C 408.4 26.9, 274.6 26.4, 237 28.1","x":0,"y":10},{"d":"M 32.1 36 C 26.3 37.4, 25.6 40.5, 29.6 48.4 C 31 51.2, 33.2 54.6, 34.5 56 C 35.7 57.4, 38.9 61.8, 41.5 65.9 C 44.1 70, 49 77.1, 52.4 81.6 C 55.7 86.1, 59.8 92, 61.3 94.7 C 62.8 97.3, 66.5 102.6, 69.5 106.5 C 72.5 110.3, 76.3 115.9, 77.9 119 C 79.5 122, 82.8 126.8, 85.2 129.6 C 89.3 134.5, 91 137.3, 98.6 150.8 C 100.4 153.8, 103.7 158.4, 106 160.9 C 108.3 163.4, 113.5 170.5, 117.6 176.5 C 126 189.1, 131.7 197.5, 146.2 218.5 C 158.9 237.1, 166.9 248.8, 171.8 256.2 C 173.8 259.3, 178.2 265.8, 181.6 270.7 C 185 275.5, 188.5 281, 189.4 282.8 C 190.3 284.6, 192.7 287.9, 194.7 290.1 C 198.3 294.1, 203.1 301.5, 208.3 311 C 209.9 314, 213.2 318.5, 215.5 321 C 219.2 324.9, 227.3 336.2, 239.5 354.5 C 241.2 357, 246.3 364.8, 250.9 371.7 C 255.6 378.7, 260.6 387.4, 262.2 391 L 264.9 397.5 265 465.7 C 265 538.5, 265 537.8, 270.2 541 L 273.5 543 349.4 543 L 425.2 543 428.6 539.6 L 432 536.2 432 470.7 C 432 432.2, 432.4 403.2, 433 400.1 C 434.1 394.2, 440.8 382.3, 450.4 369.2 C 453.9 364.4, 457.8 358.5, 459 356 C 460.3 353.5, 463 349.5, 465 347 C 467.1 344.5, 471.3 338.7, 474.4 334 C 477.4 329.3, 481.6 323.3, 483.7 320.5 C 489.3 313.2, 495.8 303.1, 498.5 298 C 499.8 295.5, 502.2 292.2, 504 290.5 C 505.7 288.9, 508.9 284.6, 511 281 C 513.1 277.4, 517.1 271.4, 519.9 267.5 C 524.4 261.2, 531.9 250.2, 563.6 203.5 C 568.8 195.8, 574.1 188.4, 575.4 187 C 576.7 185.6, 581.2 179.2, 585.4 172.8 C 589.6 166.3, 593.9 160.6, 594.9 160 C 596 159.5, 598.1 156.4, 599.6 153.3 C 601.1 150.1, 603.6 145.9, 605 144 C 606.5 142.1, 608.5 138.9, 609.5 137 C 610.5 135.1, 613 131.5, 615 129 C 617.1 126.5, 619.8 122.5, 621 120 C 622.3 117.5, 627.1 110.3, 631.8 104 C 636.5 97.7, 642 90.3, 644 87.5 C 648.2 81.8, 658.1 66.7, 660 63.1 C 660.7 61.8, 663.3 58.2, 665.8 55.1 C 674 45, 674.9 39.1, 668.5 36.4 C 663.4 34.3, 488.3 34.3, 484.2 36.4 C 479.9 38.7, 470.1 49.6, 461 62.5 C 456 69.6, 442.2 88, 437.2 94.4 C 435.5 96.6, 432.5 100.5, 430.7 102.9 C 429 105.3, 424.8 110.9, 421.5 115.3 C 418.2 119.7, 412.2 127.8, 408.2 133.4 C 404.2 138.9, 398.7 145.8, 396.1 148.5 C 393.4 151.3, 390.4 155.1, 389.5 157 C 388 160.1, 384.4 165.2, 365.2 190.8 C 352.6 207.6, 347.1 207.6, 334.4 190.6 C 330.3 185, 324.2 177, 320.9 172.7 C 317.6 168.5, 313.3 162.4, 311.4 159.2 C 309.5 156.1, 305.8 151.3, 303.1 148.5 C 300.4 145.8, 295.8 139.9, 292.9 135.5 C 285.8 124.9, 270 103.5, 265.7 98.5 C 263.8 96.3, 259.2 90.2, 255.4 85 C 251.7 79.8, 247 73.5, 244.9 71 C 242.9 68.5, 239.5 63.7, 237.4 60.3 C 231.6 51.2, 223.6 41.7, 218.9 38.4 L 214.7 35.5 125.1 35.3 C 75.8 35.3, 34 35.5, 32.1 36","x":1230,"y":0},{"d":"M 33.5 38.2 C 32 40, 31 42.4, 31 44.3 C 30.5 155, 31.2 536.5, 31.9 538.4 C 34 543.7, 31.4 543.5, 116.2 543 L 194.9 542.5 197.2 540.2 L 199.5 537.9 200 394.2 C 200.3 315.2, 200.9 249.7, 201.3 248.8 C 204.3 242.8, 211.8 247.3, 221.7 261.3 C 224.4 264.9, 231.5 273.6, 237.5 280.6 C 243.6 287.5, 249.6 294.9, 251 296.9 C 255 302.7, 263 312.8, 269.3 319.9 C 272.5 323.5, 277.1 329.5, 279.5 333.1 C 281.9 336.7, 284.9 340.4, 286.3 341.3 C 287.6 342.2, 292.5 347.7, 297.1 353.5 C 301.7 359.4, 307.8 367, 310.5 370.5 C 313.3 374, 319.8 382, 325.1 388.2 C 330.4 394.4, 336.8 402.3, 339.4 405.7 C 342 409.1, 344.6 412.2, 345.1 412.6 C 345.7 412.9, 347.8 415.8, 349.7 418.9 C 351.7 422, 355.4 426.8, 358 429.5 C 360.5 432.3, 365.2 438, 368.4 442.3 C 371.5 446.5, 375.2 450.7, 376.6 451.6 C 377.9 452.5, 382.3 457.6, 386.2 462.9 C 390.2 468.2, 394.8 474.1, 396.4 476.1 C 398.1 478, 402 482.7, 405 486.5 C 408 490.2, 414.3 497.9, 419 503.5 C 435.7 523.7, 439.7 528.6, 442.6 532.7 C 444.2 535, 447.5 538.2, 450 539.9 L 454.5 543 564.1 543 C 624.3 543.1, 674.4 542.8, 675.3 542.4 C 676.3 542.1, 677.8 540.4, 678.8 538.6 L 680.5 535.5 680.8 292 C 681 33.2, 681.2 40.9, 676.2 37 L 673.7 34.9 598.1 35.2 L 522.5 35.5 519 37.5 C 512.9 41.1, 513.2 34.6, 513.2 181.5 C 513.1 255.8, 513.1 317.9, 513 319.7 C 512.9 326.5, 506.4 328.2, 501 322.9 C 499.3 321.1, 495.6 316.3, 492.8 312.1 C 490 308, 486.4 303.5, 484.8 302.1 C 483.2 300.8, 479.4 296.3, 476.3 292.1 C 473.3 287.9, 468.7 282.3, 466.1 279.5 C 463.5 276.8, 460.1 272.7, 458.4 270.5 C 456.7 268.3, 452.4 262.8, 448.9 258.2 C 445.4 253.6, 441.2 248.2, 439.7 246.2 C 438.2 244.2, 433.4 238.7, 429.2 234.1 C 425 229.4, 420.2 223.7, 418.5 221.4 C 413.8 214.8, 398.1 194.9, 394 190.5 C 392 188.3, 389 184.6, 387.3 182.3 C 385.7 180, 381.1 174.3, 377.2 169.8 C 373.3 165.2, 366.5 157, 362.1 151.5 C 357.7 146, 349.7 136.3, 344.5 130 C 339.2 123.7, 332.8 115.8, 330.2 112.4 C 317 95.4, 308.2 84.6, 300.9 76.4 C 296.5 71.5, 291.7 65.6, 290.2 63.4 C 284.1 54.3, 269.7 38.4, 265.7 36.4 C 263.3 35.1, 247 34.9, 149.4 35.1 L 36 35.3 33.5 38.2","x":2430,"y":0},{"d":"M 253.8 28.3 C 250.9 30, 244.2 42.7, 241.1 52.3 C 240.4 54.3, 238.1 58.6, 236 61.8 C 233.9 64.9, 231.4 70.2, 230.5 73.5 C 228.9 79.3, 223.8 90.7, 216.1 106 C 214 110.1, 211.3 116.6, 210.1 120.3 C 208.9 124.1, 206.8 128.9, 205.4 131.1 C 204.1 133.3, 202.1 137.3, 201 140 C 199.9 142.8, 197.7 147.6, 196.2 150.7 C 194.6 153.9, 192.3 159.7, 191 163.5 C 189.7 167.4, 187.4 172.5, 185.7 174.9 C 182.1 180.2, 177 191.9, 172.3 205.5 C 170.4 211, 167.6 217.1, 166.1 219 C 162.5 223.6, 160.5 227.5, 159 233 C 158.3 235.4, 156.7 239.7, 155.3 242.5 C 153.9 245.2, 151.9 249.9, 150.8 253 C 149.8 256, 147.4 260.8, 145.4 263.6 C 143.5 266.5, 140.9 272.1, 139.6 276.1 C 136.4 285.8, 129.7 301.1, 125.4 308 C 123.5 311.1, 121.2 316.6, 120.1 320.3 C 119.1 324, 117.2 328.7, 115.8 330.7 C 114.4 332.8, 112.3 337.2, 111.1 340.5 C 109.9 343.8, 107.6 348.5, 106 351 C 104.4 353.5, 102.2 358.8, 101.1 362.9 C 100 367, 97.3 373.3, 95.1 376.9 C 89.8 385.6, 83.4 400.5, 81.4 408.5 C 80.3 412.7, 78.2 417.1, 75.3 421.2 C 72.9 424.7, 70.2 430, 69.3 433 C 68.5 436, 66.6 440.7, 65.2 443.5 C 63.9 446.2, 61.9 450.9, 60.9 453.8 C 59.9 456.8, 57.2 461.9, 55 465.2 C 52.8 468.5, 50.3 473.8, 49.4 476.9 C 47.7 483, 45.8 487.3, 35.6 508 C 27.8 523.9, 27.3 528.2, 33.1 531.8 C 34.6 532.8, 173.2 533.7, 213.1 533 C 217.2 533, 224.7 520.9, 229 507.5 C 230.3 503.7, 232.8 498.3, 234.6 495.5 C 236.5 492.8, 238.8 488, 239.8 485 C 240.9 481.9, 242.9 477.2, 244.2 474.5 C 245.6 471.7, 247.7 466.3, 248.9 462.3 C 251.3 454.3, 254.5 450.8, 260.9 449 C 263.5 448.3, 304.5 448.1, 385.7 448.2 L 506.5 448.5 509.6 450.7 C 513.2 453.3, 518.2 462.4, 519.9 469.5 C 520.6 472.3, 522.9 477.4, 525 481 C 527.2 484.6, 529.9 490.2, 531 493.4 C 532.1 496.6, 534.1 501.2, 535.4 503.6 C 536.7 506, 538.8 510.8, 540 514.4 C 542.6 522.4, 545.3 526.4, 550.6 530.2 L 554.7 533.2 644.6 533.1 L 734.5 533 736.3 530.9 C 739.1 527.4, 738.5 521.2, 734.6 513.8 C 732.7 510.2, 730.6 505.2, 729.9 502.7 C 729.3 500.2, 726.8 495.1, 724.5 491.5 C 722 487.8, 719.7 482.7, 719.1 479.8 C 718.5 477, 716.7 472.2, 715.1 469.1 C 705.8 450.7, 699.9 437.8, 698.6 433 C 697.7 430, 695.5 425, 693.5 422.1 C 691.6 419.1, 689.5 415, 688.9 413.1 C 688.2 411.1, 686.2 406.8, 684.4 403.5 C 682.6 400.2, 680.6 395.3, 679.9 392.5 C 679.3 389.8, 677 384.6, 674.9 381 C 672.8 377.4, 670.1 371.8, 668.9 368.5 C 667.7 365.2, 665.8 361.2, 664.8 359.5 C 663.8 357.9, 661.9 352.8, 660.5 348.4 C 659.1 343.9, 656.4 337.9, 654.4 335 C 652.4 332.1, 649.8 326.8, 648.5 323.1 C 647.3 319.5, 645.3 314.5, 644 312 C 642.8 309.6, 640.9 305.2, 639.9 302.2 C 638.9 299.3, 636.4 294.6, 634.4 291.9 C 632.4 289.2, 629.9 283.9, 628.8 280.2 C 627.7 276.5, 625.6 271.3, 624.3 268.5 C 622.9 265.8, 620.9 261.2, 619.9 258.3 C 618.9 255.4, 616.8 251.1, 615.1 248.7 C 613.5 246.3, 611.1 241.2, 609.9 237.4 C 608.7 233.6, 604 222.9, 599.4 213.5 C 594.9 204.2, 590.4 193.9, 589.5 190.7 C 588.7 187.6, 586.2 182.2, 584 178.9 C 581.8 175.5, 579.8 171.8, 579.5 170.7 C 579.2 169.5, 577.2 164.7, 575 160 C 572.8 155.3, 570.4 149, 569.6 145.9 C 568.7 142.9, 566.5 138.3, 564.5 135.7 C 562.6 133.2, 559.4 126.9, 557.6 121.8 C 552 106.4, 547.8 96.8, 544.4 91.8 C 542.6 89.2, 540.4 84.7, 539.4 81.8 C 538.5 78.9, 536.5 74, 535 71 C 533.5 68, 531.5 62.8, 530.5 59.5 C 529.6 56.2, 527.1 51.3, 525 48.5 C 523 45.8, 520.7 41.7, 520 39.5 C 519.3 37.3, 518.1 34.3, 517.3 32.8 C 514.3 26.8, 521.9 27.1, 383.5 26.8 L 256.7 26.5 253.8 28.3 M 380.9 173 C 378.3 174.5, 373.2 183.2, 371 189.6 C 369.9 192.9, 368.2 196.7, 367.2 198.1 C 366.3 199.6, 364.3 202.5, 362.9 204.6 C 361.5 206.8, 359.4 211, 358.2 214 C 352.8 228.2, 348 238.4, 344.7 243.3 C 342.6 246.3, 339.9 251.3, 338.6 254.6 C 334.5 264.7, 327.1 279.3, 323.5 284.4 C 318.6 291.2, 318.8 296.8, 324.1 299.5 C 327.7 301.4, 435.6 301.7, 440.9 299.9 C 446.8 297.8, 447.3 294.6, 443 285.5 C 441.4 282, 440 278.7, 440 278.2 C 440 277.8, 438 274.5, 435.5 271 C 433.1 267.6, 430.3 262.4, 429.4 259.6 C 428.5 256.8, 426.6 252.5, 425.1 250 C 423.6 247.5, 421.6 243.5, 420.5 241 C 419.4 238.5, 417.1 234.2, 415.2 231.4 C 413.4 228.6, 411.1 223.5, 410 220.1 C 409 216.7, 407.1 212.4, 405.7 210.7 C 402.7 206.6, 392.5 185.8, 390.9 180.3 C 388.9 173.3, 385.1 170.5, 380.9 173","x":3640,"y":10},{"d":"M 34.3 27.3 C 33.2 28.5, 32 30.4, 31.6 31.5 C 30.5 34.5, 30.8 525.4, 31.9 528.2 C 33.9 533.4, 30.4 533.2, 114.5 533.1 C 166.3 533, 193.8 532.6, 195.1 532 C 199.9 529.4, 200 528.1, 200 480.6 C 200 432.2, 199.9 433.7, 204.4 431.2 L 207.5 429.5 316 428.9 C 419.7 428.4, 431.9 428, 440.3 425.4 C 441.3 425.1, 449.5 423.4, 458.6 421.6 C 472.5 418.8, 475.9 417.8, 480.8 414.7 C 484 412.7, 489.7 410.3, 493.6 409.4 C 501.4 407.5, 515.3 400.5, 521.9 395.1 C 524.4 393.1, 528.8 390.2, 531.6 388.5 C 552.1 376.8, 581.2 341.2, 589.1 318.1 C 590.1 315.2, 592.4 310.5, 594 307.8 C 597.7 301.9, 598.8 297.6, 603.9 269 C 609.9 236, 610.2 196, 604.6 175 C 603.7 172, 602.2 163.7, 601 156.7 C 599 144.3, 597.8 140.4, 593.9 134.9 C 592.9 133.5, 591.2 129.9, 590 126.9 C 586.3 117.2, 578.8 103.6, 574.6 99 C 572.3 96.5, 569.4 92.8, 568.2 90.8 C 564.8 85.2, 544.7 67.5, 537.2 63.3 C 533.5 61.3, 528.3 58, 525.5 55.9 C 518.5 50.7, 500.8 42.4, 492.7 40.6 C 488.8 39.7, 483.4 37.5, 480 35.4 L 474 31.7 458.3 29.9 C 416.9 24.9, 421.3 25, 222.9 25 L 36.3 25 34.3 27.3 M 204.5 174.2 C 200.4 177.8, 200 181.8, 200 227.8 C 200 276.4, 200.1 276.9, 206.5 279.6 C 211.4 281.6, 405.6 281.2, 412.9 279.1 C 420.5 277, 435.3 267.6, 440.2 261.8 C 451 248.9, 452.3 244.4, 451.8 222.6 L 451.5 207.5 449 202.5 C 443.2 190.7, 431.4 181.6, 414.5 175.9 L 404.5 172.5 305.8 172.2 L 207.2 171.9 204.5 174.2","x":4900,"y":10},{"d":"M 233 28.1 C 224.5 28.5, 206.9 29.3, 194 29.9 C 170.1 30.9, 169.4 31, 154.5 36.3 C 150.7 37.7, 143 39.6, 137.5 40.4 C 119.3 43.4, 96.5 50.9, 90.9 55.8 C 89 57.4, 85.2 59.9, 82.3 61.3 C 66.1 69.5, 45.4 94.5, 40.5 111.9 C 39.3 116.1, 36.7 122.5, 34.6 126.2 C 31.4 131.9, 30.8 134.3, 30 142.2 C 29.5 147.3, 28.4 158.5, 27.5 167 C 25.4 188.5, 25.6 198.1, 28.5 218.5 C 31.1 236.8, 31.3 237.5, 36.6 245.2 C 38.4 247.8, 40.1 251.9, 40.5 254.2 C 42.8 268.1, 61.9 290.2, 79.5 299.2 C 81.7 300.4, 85.3 302.7, 87.5 304.5 C 94.8 310.4, 105.9 314.5, 125.5 318.4 C 134.2 320.2, 140.8 322.2, 145.5 324.5 C 154 328.7, 157.3 329.4, 181 332 C 191.2 333.1, 200.2 334.3, 201 334.5 C 204.1 335.5, 226.9 338, 245 339.5 C 262 340.9, 271.1 342.2, 295 346.6 C 299.7 347.5, 313.6 348.6, 326 349.1 C 360 350.4, 411.3 353.5, 423.5 355 C 427.9 355.5, 441.3 356.9, 453.2 357.9 C 476 360, 478.5 360.7, 483.1 365.7 C 489.9 373.1, 490.9 378.6, 486.4 384 C 481.2 390.1, 473 392.7, 449.5 395.6 C 430.6 397.9, 293.9 397.8, 280.1 395.4 C 275.5 394.6, 270.1 394, 268.1 394 C 266.1 394, 262.9 393.5, 261 393 C 259.1 392.4, 251.3 391.5, 243.7 391 C 228.5 389.9, 225.7 389, 217.6 383 C 210.9 378.1, 209.4 375.9, 208.5 369.8 C 208 366.8, 206.9 364.4, 205.3 362.8 L 202.8 360.5 122.4 360.2 C 34.3 359.9, 36.2 359.8, 33.9 365.7 C 32.4 369.4, 33.4 392.8, 35.3 399.5 C 36.1 402.3, 37.9 412.6, 39.4 422.5 C 43.5 448.9, 48.5 464, 55.9 472.4 C 58.5 475.2, 61.7 479.2, 63 481.3 C 66.1 486, 77.6 495.2, 84.9 499 C 88 500.5, 92.2 503.2, 94.4 504.9 C 100.1 509.5, 125.9 517.7, 140.3 519.5 C 148 520.5, 155.2 522.2, 163.2 525 L 174.9 529.1 217.7 530.8 C 274 533, 434.6 533, 490.5 530.7 L 527.5 529.2 538.5 525.7 C 552.1 521.4, 551 521.6, 571 518.6 C 580.1 517.2, 591.6 515, 596.5 513.6 C 601.5 512.2, 608.1 510.6, 611.3 510 C 615.3 509.2, 618.4 507.8, 621.8 505.1 C 624.4 503, 628.7 500.5, 631.4 499.5 C 645.9 493.9, 662.5 476.6, 672.8 456.3 L 678 446 680.1 430.3 C 681.2 421.6, 682.5 412.7, 683 410.5 C 683.5 408.3, 684.2 397.7, 684.5 387 C 685.3 366.6, 684.7 359.5, 679.9 325 L 677.9 310.5 672.3 300.5 C 662.9 283.8, 642.5 266.1, 626.5 260.6 C 622.6 259.3, 616.9 256.8, 613.8 255.1 C 610 252.9, 602.8 250.6, 592.3 248 C 576.1 244, 570.3 243.1, 544.9 240.6 C 535.2 239.6, 524.7 237.7, 513.9 235 L 497.5 230.8 478.6 229.9 C 468.2 229.5, 452.7 228.4, 444.1 227.5 C 409.7 224.2, 385.7 222.3, 352 220.5 C 340.6 219.9, 307.7 215, 301 213 C 299.1 212.4, 284 211.3, 267.5 210.5 C 224.8 208.5, 218.5 207.6, 210.7 202.3 C 197.3 193, 205.4 176, 225 172.1 C 245.5 168, 405.7 166.7, 436.9 170.3 C 463.8 173.4, 479.6 182.3, 488.4 199 C 490.4 202.8, 493 206.4, 494 207 C 495.3 207.7, 523.4 208, 579.1 207.8 L 662.2 207.5 664.5 204.8 C 668.9 199.7, 668.7 180.4, 664.1 158.5 C 663 153, 661.2 143.4, 660.1 137.1 C 658.4 127.4, 657.5 124.8, 654.6 120.6 C 652.7 117.8, 650.4 113.7, 649.5 111.5 C 644.2 98.8, 629.9 80.3, 619.4 72.7 C 609.3 65.5, 603.1 61.8, 598.6 60.5 C 595.8 59.7, 590.7 57.2, 587.1 55 C 575.7 48.2, 567.7 45.9, 541 41.4 C 527.2 39.2, 524.8 38.6, 511 34.6 C 497.2 30.5, 499.6 30.8, 446 28.5 C 408.7 26.9, 262.2 26.6, 233 28.1","x":6040,"y":10},{"d":"M 34.3 37.3 C 33.2 38.5, 32 40.4, 31.6 41.5 C 30.5 44.4, 30.8 535.5, 31.9 538.2 C 32.4 539.5, 33.5 541.1, 34.3 541.8 C 36.8 543.9, 583.1 543.5, 587 541.5 C 593.2 538.3, 593 540.1, 593 471.8 C 593 403.7, 593.2 405.8, 587 402.8 L 583.6 401 398 401.1 C 296 401.1, 210.8 401.1, 208.7 401.1 C 206.1 401, 204.2 400.3, 202.5 398.5 L 200 396.1 200 380 C 200 362.9, 200.8 359.2, 205 357 C 206.5 356.2, 259 355.9, 383.6 355.9 C 485.7 355.9, 561.2 355.5, 562.5 355 C 563.8 354.5, 565.7 352.9, 566.7 351.3 L 568.5 348.6 568.8 287.8 L 569.1 227.1 566.1 223.8 L 563.2 220.5 384.8 220.4 C 193.9 220.4, 202.9 220.6, 201 215.4 C 199.6 211.9, 199.8 185, 201.1 181.1 C 203.4 174.5, 188.9 175, 396.7 175 L 585.6 175 587.9 173.4 C 593 169.8, 593 169.5, 593 105.3 L 593 45.5 591.2 42 C 590.2 40, 588 37.8, 586 36.7 L 582.5 35 309.4 35 L 36.3 35 34.3 37.3","x":7260,"y":0}]}};
  var SVGNS = 'http://www.w3.org/2000/svg';
  var uid = 0;
  var calm = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ── a real spring, as a CSS easing ─────────────────────────────────────
     linear() takes a list of points, so a damped spring can be sampled once and used
     as an ordinary easing. Browsers without it get the nearest cubic-bezier. */
  function springEasing(stiffness, damping) {
    var pts = [], n = 44, w = Math.sqrt(stiffness), z = damping / (2 * w), wd = w * Math.sqrt(Math.max(1 - z * z, 0.0001));
    var T = 1.15;
    for (var i = 0; i <= n; i++) {
      var t = (i / n) * T;
      var v = 1 - Math.exp(-z * w * t) * (Math.cos(wd * t) + (z * w / wd) * Math.sin(wd * t));
      pts.push(Math.round(v * 1000) / 1000);
    }
    pts[n] = 1;
    return 'linear(' + pts.join(',') + ')';
  }
  var canLinear = !!(window.CSS && CSS.supports && CSS.supports('animation-timing-function', 'linear(0, 1)'));
  var SPRING = canLinear ? springEasing(190, 11) : 'cubic-bezier(.34,1.56,.64,1)';
  var SPRING_SOFT = canLinear ? springEasing(120, 9) : 'cubic-bezier(.3,1.35,.55,1)';

  /* ── the styles, injected once ──────────────────────────────────────── */
  var css = [
    ':root{--bm-spring:' + SPRING + ';--bm-spring-soft:' + SPRING_SOFT + ';--bm-orange:#FF8A2D}',
    '.bm{display:inline-block;overflow:visible;vertical-align:middle;color:#151515;flex:none;-webkit-tap-highlight-color:transparent}',
    'html[data-theme="dark"] .bm{color:#F5F2EE}',
    '.bm.bm-white{color:#fff}',
    '.bm.bm-ink{color:#151515}',
    '.bm .bp{transform-box:fill-box;transform-origin:50% 50%}',
    '.bm .bp-spine{transform-origin:50% 100%}',
    '.bm .bp-s{transform-origin:100% 0}',
    '.bm .bp-a{transform-origin:50% 100%}',
    /* arrival: the parts snap together */
    '.bm.bm-in .bp-spine{animation:bmSpine 880ms var(--bm-spring) both}',
    '.bm.bm-in .bp-s{animation:bmS 880ms var(--bm-spring) 70ms both}',
    '.bm.bm-in .bp-a{animation:bmA 880ms var(--bm-spring) 140ms both}',
    '@keyframes bmSpine{from{transform:translateY(34%) scaleY(.55);opacity:0}18%{opacity:1}to{transform:none;opacity:1}}',
    '@keyframes bmS{from{transform:translate(-26%,-34%) scale(.5) rotate(-12deg);opacity:0}18%{opacity:1}to{transform:none;opacity:1}}',
    '@keyframes bmA{from{transform:translate(18%,36%) scale(.5) rotate(10deg);opacity:0}18%{opacity:1}to{transform:none;opacity:1}}',
    /* hover: jelly, and the parts pop apart and spring home */
    '.bm.bm-pop{animation:bmJelly 760ms var(--bm-spring-soft) both}',
    '.bm.bm-pop .bp-spine{animation:bmApartSpine 760ms var(--bm-spring) both}',
    '.bm.bm-pop .bp-s{animation:bmApartS 760ms var(--bm-spring) both}',
    '.bm.bm-pop .bp-a{animation:bmApartA 760ms var(--bm-spring) both}',
    '@keyframes bmJelly{from{transform:scale(.86,1.12) rotate(-3deg)}to{transform:none}}',
    '@keyframes bmApartSpine{from{transform:translate(-9%,0)}to{transform:none}}',
    '@keyframes bmApartS{from{transform:translate(8%,-7%) rotate(5deg)}to{transform:none}}',
    '@keyframes bmApartA{from{transform:translate(7%,7%) rotate(-5deg)}to{transform:none}}',
    /* press: squashed under the finger, released into a pop */
    '.bm{transition:transform 120ms cubic-bezier(.2,.8,.2,1)}',
    '.bm.bm-press{transform:scale(.84,.8);animation:none}',
    /* idle: alive, never busy */
    '.bm.bm-idle:not(.bm-pop):not(.bm-hop) .bp-spine{animation:bmIdleA 5.4s ease-in-out infinite}',
    '.bm.bm-idle:not(.bm-pop):not(.bm-hop) .bp-s{animation:bmIdleB 4.6s ease-in-out -1.3s infinite}',
    '.bm.bm-idle:not(.bm-pop):not(.bm-hop) .bp-a{animation:bmIdleC 5.9s ease-in-out -2.6s infinite}',
    '@keyframes bmIdleA{0%,100%{transform:translateY(0)}50%{transform:translateY(-1.6%)}}',
    '@keyframes bmIdleB{0%,100%{transform:translate(0,0)}50%{transform:translate(1.4%,-1.2%)}}',
    '@keyframes bmIdleC{0%,100%{transform:translate(0,0)}50%{transform:translate(-1.2%,1.4%)}}',
    /* a hop, for scroll moments */
    '.bm.bm-hop{animation:bmHop 780ms var(--bm-spring) both}',
    '@keyframes bmHop{0%{transform:translateY(0) scale(1.08,.92)}30%{transform:translateY(-16%) scale(.94,1.08)}to{transform:none}}',
    /* loading: the parts take turns */
    '.bm.bm-wait .bp-spine{animation:bmWait 1.1s var(--bm-spring-soft) infinite}',
    '.bm.bm-wait .bp-s{animation:bmWait 1.1s var(--bm-spring-soft) .14s infinite}',
    '.bm.bm-wait .bp-a{animation:bmWait 1.1s var(--bm-spring-soft) .28s infinite}',
    '@keyframes bmWait{0%{transform:translateY(0)}22%{transform:translateY(-9%)}48%,100%{transform:translateY(0)}}',
    /* the letters of the word */
    '.bw{display:inline-block;will-change:auto}',
    '.bw-in .bw{animation:bwIn 700ms var(--bm-spring) both;animation-delay:calc(var(--i) * 38ms + 160ms)}',
    '@keyframes bwIn{from{transform:translateY(60%) scale(.7);opacity:0}30%{opacity:1}to{transform:none;opacity:1}}',
    '.bw-wave .bw{animation:bwWave 640ms var(--bm-spring) both;animation-delay:calc(var(--i) * 34ms)}',
    '@keyframes bwWave{0%{transform:translateY(0)}28%{transform:translateY(-34%) scale(1.12)}to{transform:none}}',
    /* sparks */
    '.bm-spark{position:fixed;left:0;top:0;width:7px;height:7px;border-radius:50%;pointer-events:none;z-index:99999;background:var(--bm-orange);will-change:transform,opacity}',
    /* the splash that every page shows while it loads: the assembled mark */
    '#syn-load .bm{width:46px;height:66px;color:var(--ink,var(--text,#151515))}',
    'html[data-theme="dark"] #syn-load .bm{color:#F5F2EE}',
    '#syn-load .bm.bm-in .bp-spine{animation-duration:760ms}',
    '#syn-load .bm.bm-in .bp-s{animation-duration:760ms}',
    '#syn-load .bm.bm-in .bp-a{animation-duration:760ms}',
    '.synload .bm{width:74px;height:102px;color:var(--ink,#151515)}',
    '@media (prefers-reduced-motion:reduce){.bm,.bm *,.bw{animation:none!important;transition:none!important}.bm .bp{opacity:1!important;transform:none!important}}'
  ].join('\n');
  var style = document.createElement('style');
  style.setAttribute('data-synbrand', '');
  style.textContent = css;
  (document.head || document.documentElement).appendChild(style);

  /* ── the mark as an inline vector, in three parts ───────────────────── */
  var M = PATHS.mark;
  function markSVG(opts) {
    opts = opts || {};
    var id = 'bm' + (++uid), o = 6, cx = M.cutX, cy = M.cutY, W = M.vb[0], H = M.vb[1];
    var svg = document.createElementNS(SVGNS, 'svg');
    svg.setAttribute('viewBox', '0 0 ' + W + ' ' + H);
    svg.setAttribute('class', 'bm' + (opts.white ? ' bm-white' : ''));
    svg.setAttribute('role', 'img'); svg.setAttribute('aria-label', 'Synapse');
    svg.setAttribute('focusable', 'false');
    /* The one traced shape, cut into a spine, the S and the arch by three clip rectangles that overlap by a hair
       so a still mark has no seams. */
    svg.innerHTML =
      '<defs>' +
      '<clipPath id="' + id + 'a"><rect x="0" y="0" width="' + (cx + o) + '" height="' + H + '"/></clipPath>' +
      '<clipPath id="' + id + 'b"><rect x="' + (cx - o) + '" y="0" width="' + W + '" height="' + (cy + o) + '"/></clipPath>' +
      '<clipPath id="' + id + 'c"><rect x="' + (cx - o) + '" y="' + (cy - o) + '" width="' + W + '" height="' + H + '"/></clipPath>' +
      '</defs>' +
      '<g class="bp bp-spine"><g clip-path="url(#' + id + 'a)"><path fill="currentColor" d="' + M.d + '"/></g></g>' +
      '<g class="bp bp-s"><g clip-path="url(#' + id + 'b)"><path fill="currentColor" d="' + M.d + '"/></g></g>' +
      '<g class="bp bp-a"><g clip-path="url(#' + id + 'c)"><path fill="currentColor" d="' + M.d + '"/></g></g>';
    return svg;
  }

  /* ── the wordmark as an inline vector, one path per letter ──────────── */
  function wordSVG() {
    var svg = document.createElementNS(SVGNS, 'svg');
    var W = PATHS.word;
    svg.setAttribute('viewBox', '0 0 ' + W.vb[0] + ' ' + W.vb[1]);
    svg.setAttribute('class', 'bm bm-word bw-in'); svg.setAttribute('role', 'img'); svg.setAttribute('aria-label', 'Synapse');
    svg.innerHTML = W.letters.map(function (l, i) {
      return '<g transform="translate(' + l.x + ' ' + l.y + ')"><g class="bw" style="--i:' + i + ';transform-box:fill-box;transform-origin:50% 100%"><path fill="currentColor" d="' + l.d + '"/></g></g>';
    }).join('');
    return svg;
  }

  /* ── motion helpers ─────────────────────────────────────────────────── */
  function replay(el, cls) {
    if (calm) return;
    el.classList.remove(cls); void el.getBoundingClientRect(); el.classList.add(cls);
  }
  function once(el, cls, ms) {
    replay(el, cls);
    clearTimeout(el['_t' + cls]);
    el['_t' + cls] = setTimeout(function () { el.classList.remove(cls); }, ms);
  }
  var lastSpark = 0;
  function sparks(x, y) {
    if (calm || !document.body || !Element.prototype.animate) return;
    var now = Date.now(); if (now - lastSpark < 260) return; lastSpark = now;
    for (var i = 0; i < 9; i++) {
      var s = document.createElement('span'); s.className = 'bm-spark';
      var a = (Math.PI * 2 * i) / 9 + Math.random() * 0.5, d = 26 + Math.random() * 30, sz = 4 + Math.random() * 5;
      s.style.width = s.style.height = sz + 'px';
      if (i % 3 === 0) s.style.background = 'currentColor';
      document.body.appendChild(s);
      var an = s.animate([
        { transform: 'translate(' + (x - sz / 2) + 'px,' + (y - sz / 2) + 'px) scale(1)', opacity: 1 },
        { transform: 'translate(' + (x + Math.cos(a) * d - sz / 2) + 'px,' + (y + Math.sin(a) * d - sz / 2) + 'px) scale(.2)', opacity: 0 }
      ], { duration: 520 + Math.random() * 200, easing: 'cubic-bezier(.2,.8,.2,1)' });
      an.onfinish = (function (el) { return function () { el.remove(); }; })(s);
    }
  }

  /* ── make one mark alive ────────────────────────────────────────────── */
  var seen = typeof IntersectionObserver === 'function' ? new IntersectionObserver(function (es) {
    es.forEach(function (e) { e.target.classList.toggle('bm-idle', e.isIntersecting && !document.hidden && !e.target._still); });
  }, { threshold: 0.2 }) : null;

  function bring(svg, o) {
    o = o || {};
    if (o.wait) { svg.classList.add('bm-wait'); return svg; }
    if (!calm) svg.classList.add('bm-in');
    if (o.still) { svg._still = true; return svg; }
    var host = o.host || svg.closest('a, button') || svg;
    var after = calm ? 0 : 1100;
    setTimeout(function () { svg.classList.remove('bm-in'); if (seen) seen.observe(svg); }, after);
    if (calm) return svg;
    var word = host.querySelector && host.querySelector('.bw-split');
    host.addEventListener('pointerenter', function (e) {
      if (e.pointerType === 'touch') return;
      once(svg, 'bm-pop', 800);
      if (word) once(word, 'bw-wave', 900);
    });
    host.addEventListener('pointerdown', function (e) {
      svg.classList.remove('bm-pop'); svg.classList.add('bm-press');
      var r = svg.getBoundingClientRect();
      sparks(r.left + r.width / 2, r.top + r.height / 2);
    });
    var release = function () { if (svg.classList.contains('bm-press')) { svg.classList.remove('bm-press'); once(svg, 'bm-pop', 800); } };
    host.addEventListener('pointerup', release); host.addEventListener('pointercancel', release); host.addEventListener('pointerleave', release);
    return svg;
  }

  /* Splitting a word into letters, so they can ripple. The text itself is unchanged (spans are inline-block). */
  function splitWord(el) {
    if (!el || el.getAttribute('data-bw')) return null;
    var tn = null;
    el.childNodes.forEach(function (n) { if (!tn && n.nodeType === 3 && n.nodeValue.trim()) tn = n; });
    if (!tn) return null;
    var txt = tn.nodeValue.trim(), wrap = document.createElement('span');
    wrap.className = 'bw-split'; wrap.setAttribute('aria-label', txt);
    for (var i = 0; i < txt.length; i++) {
      var s = document.createElement('span'); s.className = 'bw'; s.style.setProperty('--i', i); s.setAttribute('aria-hidden', 'true'); s.textContent = txt[i];
      wrap.appendChild(s);
    }
    tn.parentNode.replaceChild(wrap, tn);
    el.setAttribute('data-bw', '1');
    if (!calm) { wrap.classList.add('bw-in'); setTimeout(function () { wrap.classList.remove('bw-in'); }, 1300); }
    return wrap;
  }

  /* ── replace the old logo pictures with the vector ──────────────────── */
  var OLD = /brand\/mark-(black-on-white-tight|white-transparent)\.(jpg|png)/;
  function upgrade(img) {
    if (img._bm || !img.parentNode || !OLD.test(img.getAttribute('src') || '')) return;
    img._bm = true;
    var cs = getComputedStyle(img), svg = markSVG({ white: /white-transparent/.test(img.src) });
    var splash = !!img.closest('#syn-load');
    ['width', 'height', 'margin', 'marginLeft', 'marginRight', 'marginTop', 'marginBottom', 'position', 'top', 'left', 'right', 'bottom', 'zIndex', 'opacity'].forEach(function (p) {
      var v = cs[p]; if (v && v !== 'auto' && v !== 'static' && v !== '0px' && !(p === 'opacity' && v === '1')) svg.style[p] = v;
    });
    if (cs.display && cs.display !== 'inline' && cs.display !== 'none') svg.style.display = cs.display;
    if (!svg.style.height && !svg.style.width) { svg.style.height = '1.4em'; }
    if (img.classList.contains('au-mark')) svg.classList.add('au-mark');
    img.parentNode.replaceChild(svg, img);
    bring(svg, { still: false });
    var host = svg.closest('a, button');
    if (host && !host._bw) {
      host._bw = true;
      var w = host.querySelector('.logo-word, .nav-logo-word') || (host.classList.contains('brand') ? host : null);
      var split = w && splitWord(w);
      void split;
    }
    return svg;
  }
  function scan(root) {
    (root.querySelectorAll ? root.querySelectorAll('img[src*="brand/mark-"]') : []).forEach(upgrade);
  }
  /* Catch them as the page is parsed, before the first paint where it can be. */
  new MutationObserver(function (ms) {
    ms.forEach(function (m) { m.addedNodes.forEach(function (n) { if (n.nodeType === 1) { if (n.tagName === 'IMG') upgrade(n); else scan(n); } }); });
  }).observe(document.documentElement, { childList: true, subtree: true });
  if (document.readyState !== 'loading') scan(document); else document.addEventListener('DOMContentLoaded', function () { scan(document); });

  /* The landing page's bar turns solid on scroll: the mark hops. */
  document.addEventListener('DOMContentLoaded', function () {
    var nb = document.getElementById('navbar');
    if (nb && !calm) {
      var was = nb.classList.contains('solid');
      new MutationObserver(function () {
        var now = nb.classList.contains('solid');
        if (now !== was) { was = now; var m = nb.querySelector('.bm'); if (m) once(m, 'bm-hop', 900); }
      }).observe(nb, { attributes: true, attributeFilter: ['class'] });
    }
    /* A mark left idle is a mark left bouncing: pause them all when the tab is hidden. */
    document.addEventListener('visibilitychange', function () {
      document.querySelectorAll('.bm-idle').forEach(function (m) { if (document.hidden) m.classList.remove('bm-idle'); });
      if (!document.hidden) document.querySelectorAll('.bm').forEach(function (m) { if (seen && !m._still) { seen.unobserve(m); seen.observe(m); } });
    });
  });

  window.SynBrand = { mark: function (o) { var s = markSVG(o); return bring(s, o); }, word: wordSVG, spring: SPRING, sparks: sparks, hop: function (el) { once(el, 'bm-hop', 900); } };
})();
