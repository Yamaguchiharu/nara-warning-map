const map = L.map('map', {
  zoomControl: false,
  attributionControl: false
}).setView([34.685, 135.832], 9);

// 白地図（背景なし）
L.tileLayer('', {}).addTo(map);

// 管理用
let layerMap = {};
let selected = new Set();

// スタイル
function defaultStyle() {
  return {
    color: "#444",
    weight: 1,
    fillColor: "#ffffff",
    fillOpacity: 1
  };
}

function selectedStyle() {
  return {
    color: "#000",
    weight: 2,
    fillColor: "orange",
    fillOpacity: 0.8
  };
}

function getColorByLevel(level) {
  switch(level) {
    case "advisory": return "yellow";  // 注意報
    case "warning": return "red";      // 警報
    case "danger": return "purple";    // 危険警報
    case "special": return "black";    // 特別警報
    default: return "white";
  }
}


let areaStatus = {}; // ← 市町村ごとの状態

// チェックリスト作成
function createList(features) {
  const container = document.getElementById("areaList");

  features.forEach(f => {
    const name = f.properties.name;

    const div = document.createElement("div");
    div.className = "area-item";

    const title = document.createElement("div");
    title.textContent = name;

    div.appendChild(title);

    // ラジオボタン群
    const levels = [
      { label: "なし", value: "" },
      { label: "注意報", value: "advisory" },
      { label: "警報", value: "warning" },
      { label: "危険", value: "danger" },
      { label: "特別", value: "special" }
    ];

    levels.forEach(l => {
      const radio = document.createElement("input");
      radio.type = "radio";
      radio.name = name; // グループ化
      radio.value = l.value;

      radio.onchange = () => {
        areaStatus[name] = l.value;
        updateLayerColor(name);
      };

      const label = document.createElement("label");
      label.textContent = l.label;

      div.appendChild(radio);
      div.appendChild(label);
    });

    container.appendChild(div);
  });
}

// 共通トグル
function toggleSelection(name) {
  const layer = layerMap[name];
  const checkbox = document.getElementById(name);

  if (selected.has(name)) {
    selected.delete(name);
    layer.setStyle(defaultStyle());
    checkbox.checked = false;
  } else {
    selected.add(name);
    layer.setStyle(selectedStyle());
    checkbox.checked = true;
  }
}

// リスト操作
function toggleFromList(name, isChecked) {
  const layer = layerMap[name];

  if (isChecked) {
    selected.add(name);
    layer.setStyle(selectedStyle());
  } else {
    selected.delete(name);
    layer.setStyle(defaultStyle());
  }
}

function updateLayerColor(name) {
  const layer = layerMap[name];

  const level = areaStatus[name];
  const color = getColorByLevel(level);

  layer.setStyle({
    fillColor: color,
    fillOpacity: 0.7,
    color: "#333",
    weight: 1
  });
}

const levelsOrder = ["", "advisory", "warning", "danger", "special"];

function getNextLevel(current) {
  const index = levelsOrder.indexOf(current);
  const nextIndex = (index + 1) % levelsOrder.length;
  return levelsOrder[nextIndex];
}

function onEachFeature(feature, layer) {
  const name = feature.properties.name;

  layerMap[name] = layer;
layer.bindTooltip(name, { permanent: false }).openTooltip();

  layer.on({
    click: () => {

      // 現在の状態取得
      const current = areaStatus[name] || "";

      // 次の状態へ
      const next = getNextLevel(current);

      // 保存
      areaStatus[name] = next;

      // 色更新
      updateLayerColor(name);

      // ラジオボタンも同期（重要）
      syncIndividualRadios(name, next);
    }
  });
}

const areaGroups = {
  "北西部": [
    "奈良市西部", "奈良市東部","生駒市", "大和郡山市", "天理市", "桜井市", "香芝市", "葛城市", "大和高田市", "橿原市", "御所市", "平群町", "三郷町", "斑鳩町", "安堵町", "王寺町", "河合町", "上牧町", "川西町", "三宅町", "広陵町", "田原本町", "高取町", "明日香村"
  ],

  "北東部": [
    "宇陀市", "山添村"
  ],

  "五條・北部吉野": [
    "五條市北部", "大淀町", "下市町", "吉野町"
  ],

  "南東部": [
    "東吉野村", "黒滝村", "川上村", "天河村", "上北山村",
    "下北山村", "曽爾村", "御杖村"
  ],

  "南西部": [
    "五條市南部", "十津川村", "野迫川村"
  ]
};

function createGroupControls() {
  const container = document.getElementById("areaList");

  Object.keys(areaGroups).forEach(groupName => {

    const div = document.createElement("div");
    div.className = "group-block";

    const title = document.createElement("h4");
    title.textContent = groupName;
    div.appendChild(title);

    const levels = [
      { label: "なし", value: "" },
      { label: "注意報", value: "advisory" },
      { label: "警報", value: "warning" },
      { label: "危険", value: "danger" },
      { label: "特別", value: "special" }
    ];

    levels.forEach(l => {
      const radio = document.createElement("input");
      radio.type = "radio";
      radio.name = groupName;
      radio.value = l.value;

      radio.onchange = () => {
        applyGroup(groupName, l.value);
      };

      const label = document.createElement("label");
      label.textContent = l.label;

      div.appendChild(radio);
      div.appendChild(label);
    });

    container.appendChild(div);
  });
}

function applyGroup(groupName, level) {

  const color = getColorByLevel(level);

  const areas = areaGroups[groupName];

  areas.forEach(name => {

    if (layerMap[name]) {
      layerMap[name].setStyle({
        fillColor: color,
        fillOpacity: 0.8
      });
    }

    // 状態保存
    areaStatus[name] = level;

    // 個別ラジオも同期したい場合
    syncIndividualRadios(name, level);
  });
}

function syncIndividualRadios(name, level) {
  const radios = document.getElementsByName(name);

  radios.forEach(r => {
    if (r.value === level) {
      r.checked = true;
    }
  });
}


// GeoJSON読み込み
fetch("data/nara.geojson")
  .then(res => res.json())
  .then(data => {

    createGroupControls();
    createList(data.features);

    L.geoJSON(data, {
      style: defaultStyle,
      onEachFeature: onEachFeature
    }).addTo(map);

  });