// ===== パーツカタログデータ =====
const CATEGORIES = [
  { id: 'mb',      name: 'マザーボード',   color: '#4a90d9' },
  { id: 'cpu',     name: 'CPU',            color: '#e67e22' },
  { id: 'ram',     name: 'メモリ',         color: '#27ae60' },
  { id: 'gpu',     name: 'グラフィックス', color: '#8e44ad' },
  { id: 'storage', name: 'ストレージ',     color: '#c0392b' },
  { id: 'cooler',  name: 'CPUクーラー',    color: '#16a085' },
  { id: 'psu',     name: '電源ユニット',   color: '#d4a017' },
  { id: 'case',    name: 'PCケース',       color: '#7f8c8d' },
];

const PARTS = [
  // ---- マザーボード ----
  { id:'mb1', cat:'mb', name:'ASUS TUF GAMING B760-PLUS WIFI D5', brand:'ASUS', price:28800,
    socket:'LGA1700', chipset:'B760', form:'ATX', memType:'DDR5', memSlots:4, memMax:192, m2:2 },
  { id:'mb2', cat:'mb', name:'MSI PRO B760M-A WIFI DDR4', brand:'MSI', price:21500,
    socket:'LGA1700', chipset:'B760', form:'MicroATX', memType:'DDR4', memSlots:4, memMax:128, m2:2 },
  { id:'mb3', cat:'mb', name:'GIGABYTE B650M AORUS ELITE', brand:'GIGABYTE', price:24000,
    socket:'AM5', chipset:'B650', form:'MicroATX', memType:'DDR5', memSlots:4, memMax:128, m2:2 },
  { id:'mb4', cat:'mb', name:'MSI MAG X870E TOMAHAWK WIFI', brand:'MSI', price:47000,
    socket:'AM5', chipset:'X870E', form:'ATX', memType:'DDR5', memSlots:4, memMax:256, m2:4 },
  { id:'mb5', cat:'mb', name:'ASRock B760M-ITX/ax', brand:'ASRock', price:22000,
    socket:'LGA1700', chipset:'B760', form:'Mini-ITX', memType:'DDR5', memSlots:2, memMax:96, m2:1 },
  { id:'mb6', cat:'mb', name:'ASUS Prime A620M-K', brand:'ASUS', price:15800,
    socket:'AM5', chipset:'A620', form:'MicroATX', memType:'DDR5', memSlots:2, memMax:96, m2:1 },

  // ---- CPU ----
  { id:'cpu1', cat:'cpu', name:'Intel Core i5-13400', brand:'Intel', price:28000,
    socket:'LGA1700', cores:10, threads:16, tdp:65, igpu:true },
  { id:'cpu2', cat:'cpu', name:'Intel Core i7-14700K', brand:'Intel', price:57000,
    socket:'LGA1700', cores:20, threads:28, tdp:125, igpu:true },
  { id:'cpu3', cat:'cpu', name:'Intel Core i9-14900K', brand:'Intel', price:88000,
    socket:'LGA1700', cores:24, threads:32, tdp:125, igpu:true },
  { id:'cpu4', cat:'cpu', name:'AMD Ryzen 5 7600', brand:'AMD', price:33000,
    socket:'AM5', cores:6, threads:12, tdp:65, igpu:true },
  { id:'cpu5', cat:'cpu', name:'AMD Ryzen 7 9700X', brand:'AMD', price:45000,
    socket:'AM5', cores:8, threads:16, tdp:65, igpu:true },
  { id:'cpu6', cat:'cpu', name:'AMD Ryzen 9 9950X', brand:'AMD', price:90000,
    socket:'AM5', cores:16, threads:32, tdp:170, igpu:true },

  // ---- メモリ ----
  { id:'ram1', cat:'ram', name:'Corsair Vengeance DDR5-5600 16GB×2', brand:'Corsair', price:12500,
    type:'DDR5', sticks:2, per:16, speed:'DDR5-5600' },
  { id:'ram2', cat:'ram', name:'G.Skill Trident Z5 DDR5-6000 32GB×2', brand:'G.Skill', price:29000,
    type:'DDR5', sticks:2, per:32, speed:'DDR5-6000' },
  { id:'ram3', cat:'ram', name:'Corsair Vengeance DDR5-5200 8GB×2', brand:'Corsair', price:8900,
    type:'DDR5', sticks:2, per:8, speed:'DDR5-5200' },
  { id:'ram4', cat:'ram', name:'Kingston FURY Beast DDR4-3200 8GB×2', brand:'Kingston', price:6800,
    type:'DDR4', sticks:2, per:8, speed:'DDR4-3200' },
  { id:'ram5', cat:'ram', name:'Crucial DDR4-3200 16GB×2', brand:'Crucial', price:10500,
    type:'DDR4', sticks:2, per:16, speed:'DDR4-3200' },

  // ---- グラフィックス ----
  { id:'gpu0', cat:'gpu', name:'内蔵GPUを使用（グラフィックスなし）', brand:'—', price:0,
    length:0, tdp:0, psuRec:0, none:true },
  { id:'gpu1', cat:'gpu', name:'NVIDIA GeForce RTX 4060', brand:'NVIDIA', price:55000,
    length:245, tdp:115, psuRec:550 },
  { id:'gpu2', cat:'gpu', name:'NVIDIA GeForce RTX 4070 SUPER', brand:'NVIDIA', price:98000,
    length:285, tdp:220, psuRec:650 },
  { id:'gpu3', cat:'gpu', name:'NVIDIA GeForce RTX 4080 SUPER', brand:'NVIDIA', price:165000,
    length:310, tdp:320, psuRec:750 },
  { id:'gpu4', cat:'gpu', name:'AMD Radeon RX 7600', brand:'AMD', price:42000,
    length:204, tdp:165, psuRec:500 },
  { id:'gpu5', cat:'gpu', name:'Intel Arc B580', brand:'Intel', price:40000,
    length:272, tdp:190, psuRec:600 },

  // ---- ストレージ ----
  { id:'st1', cat:'storage', name:'WD Black SN770 1TB', brand:'WD', price:11000,
    stype:'M.2 NVMe', cap:1000 },
  { id:'st2', cat:'storage', name:'Samsung 990 PRO 2TB', brand:'Samsung', price:24000,
    stype:'M.2 NVMe', cap:2000 },
  { id:'st3', cat:'storage', name:'Crucial P3 Plus 2TB', brand:'Crucial', price:15500,
    stype:'M.2 NVMe', cap:2000 },
  { id:'st4', cat:'storage', name:'WD Blue 1TB SATA SSD', brand:'WD', price:9000,
    stype:'SATA SSD', cap:1000 },
  { id:'st5', cat:'storage', name:'Seagate BarraCuda 2TB HDD', brand:'Seagate', price:7500,
    stype:'HDD', cap:2000 },

  // ---- CPUクーラー ----
  { id:'co1', cat:'cooler', name:'Thermalright Peerless Assassin 120 SE', brand:'Thermalright', price:5000,
    ctype:'空冷', height:155, tdpSupport:220, sockets:['LGA1700','AM5','AM4'] },
  { id:'co2', cat:'cooler', name:'Noctua NH-D15', brand:'Noctua', price:12000,
    ctype:'空冷', height:165, tdpSupport:250, sockets:['LGA1700','AM5','AM4'] },
  { id:'co3', cat:'cooler', name:'DeepCool AK620', brand:'DeepCool', price:8500,
    ctype:'空冷', height:160, tdpSupport:220, sockets:['LGA1700','AM5','AM4'] },
  { id:'co4', cat:'cooler', name:'ARCTIC Liquid Freezer III 240', brand:'ARCTIC', price:11000,
    ctype:'水冷', height:60, tdpSupport:250, sockets:['LGA1700','AM5','AM4'] },
  { id:'co5', cat:'cooler', name:'Intel Laminar RH1（純正）', brand:'Intel', price:3000,
    ctype:'純正', height:60, tdpSupport:125, sockets:['LGA1700'] },
  { id:'co6', cat:'cooler', name:'Cooler Master Hyper 212 Black', brand:'Cooler Master', price:4500,
    ctype:'空冷', height:158, tdpSupport:180, sockets:['LGA1700','AM5','AM4'] },

  // ---- 電源ユニット ----
  { id:'ps1', cat:'psu', name:'Corsair CV550 (550W 80PLUS Bronze)', brand:'Corsair', price:7000,
    watt:550, eff:'80PLUS Bronze' },
  { id:'ps2', cat:'psu', name:'Green ATX 650W 80PLUS Bronze', brand:'Green', price:8500,
    watt:650, eff:'80PLUS Bronze' },
  { id:'ps3', cat:'psu', name:'Seasonic FOCUS GX-750 (750W Gold)', brand:'Seasonic', price:13500,
    watt:750, eff:'80PLUS Gold' },
  { id:'ps4', cat:'psu', name:'Corsair RM850x (850W Gold)', brand:'Corsair', price:16000,
    watt:850, eff:'80PLUS Gold' },
  { id:'ps5', cat:'psu', name:'ASUS TUF Gaming 1000W Platinum', brand:'ASUS', price:25000,
    watt:1000, eff:'80PLUS Platinum' },

  // ---- PCケース ----
  { id:'cs1', cat:'case', name:'Fractal Design Pop Air', brand:'Fractal', price:11000,
    forms:['ATX','MicroATX','Mini-ITX'], gpuMax:355, coolerMax:160 },
  { id:'cs2', cat:'case', name:'NZXT H5 Flow', brand:'NZXT', price:13500,
    forms:['ATX','MicroATX','Mini-ITX'], gpuMax:365, coolerMax:165 },
  { id:'cs3', cat:'case', name:'Cooler Master NR200P', brand:'Cooler Master', price:11500,
    forms:['MicroATX','Mini-ITX'], gpuMax:282, coolerMax:130 },
  { id:'cs4', cat:'case', name:'Jonsbo D31 Mesh', brand:'Jonsbo', price:12000,
    forms:['MicroATX','Mini-ITX'], gpuMax:420, coolerMax:168 },
  { id:'cs5', cat:'case', name:'SilverStone SUGO 16', brand:'SilverStone', price:10000,
    forms:['MicroATX','Mini-ITX'], gpuMax:265, coolerMax:70 },
  { id:'cs6', cat:'case', name:'Antec NX420', brand:'Antec', price:7500,
    forms:['ATX','MicroATX','Mini-ITX'], gpuMax:320, coolerMax:162 },
];

const PART_BY_ID = {};
PARTS.forEach(p => PART_BY_ID[p.id] = p);
const CAT_BY_ID = {};
CATEGORIES.forEach(c => CAT_BY_ID[c.id] = c);
