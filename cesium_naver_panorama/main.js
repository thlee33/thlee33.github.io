// 네이버 본사 그린팩토리 앞 도로 위경도
const INITIAL_LAT = 37.5798422;
const INITIAL_LNG = 126.8879039;
const INITIAL_HEIGHT = 40.0; // 지표면에서 약간 띄운 높이 (미터 단위)
const INITIAL_HEADING = 3.0; // 북쪽
const INITIAL_PITCH = 0.0; // 수평

// ==========================================
// 1. Cesium Viewer 초기화
// ==========================================
Cesium.Ion.defaultAccessToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJqdGkiOiIxZTBiMzA2OS04ZTMxLTQ1NjMtYjU5OC1lMWVlMWViZmI1MjgiLCJpZCI6MzA1NywiaWF0IjoxNzY5NTc0NzY3fQ.2t_Z8vHd3k6LbTHlxTZj76HiAHsCvsxms1lkM80nOB4';

const viewer = new Cesium.Viewer('cesiumContainer', {
    //terrain: Cesium.Terrain.fromWorldTerrain(), // 3D 지형
    baseLayerPicker: false,
    geocoder: false,
    homeButton: false,
    infoBox: false,
    navigationHelpButton: false,
    sceneModePicker: false,
    animation: false,
    timeline: false,
    fullscreenButton: false,
    requestRenderMode: true,     // 성능 최적화: 필요 시에만 렌더링
    maximumRenderTimeChange: Infinity
});

// 초기 카메라 위치 설정
viewer.camera.setView({
    destination: Cesium.Cartesian3.fromDegrees(INITIAL_LNG, INITIAL_LAT, INITIAL_HEIGHT),
    orientation: {
        heading: Cesium.Math.toRadians(INITIAL_HEADING),
        pitch: Cesium.Math.toRadians(INITIAL_PITCH),
        roll: 0.0
    }
});

// ==========================================
// 3D 빌딩(OSM Buildings) 타일셋 추가
// ==========================================
Cesium.createOsmBuildingsAsync().then(function (buildingTileset) {
    viewer.scene.primitives.add(buildingTileset);
});

// ==========================================
// 2. Naver Panorama 초기화
// ==========================================
const panorama = new naver.maps.Panorama('panoContainer', {
    position: new naver.maps.LatLng(INITIAL_LAT, INITIAL_LNG),
    pov: {
        pan: INITIAL_HEADING,
        tilt: INITIAL_PITCH,
        fov: 100
    },
    flightSpot: false, // 항공뷰 버튼 숨김
    aroundControl: true,
    zoomControl: true,
    zoomControlOptions: {
        position: naver.maps.Position.TOP_RIGHT
    }
});

// ==========================================
// 3. 양방향 카메라 동기화 (Sync Logic)
// ==========================================
let isCesiumUpdating = false;
let isNaverUpdating = false;

// [A] Cesium Camera -> Naver Panorama 동기화
viewer.camera.changed.addEventListener(function () {
    if (isNaverUpdating) return;
    isCesiumUpdating = true;

    // 1) 위치(Position) 업데이트
    const cartographic = viewer.camera.positionCartographic;
    const lat = Cesium.Math.toDegrees(cartographic.latitude);
    const lng = Cesium.Math.toDegrees(cartographic.longitude);

    panorama.setPosition(new naver.maps.LatLng(lat, lng));

    // 2) 시점(POV) 업데이트
    const heading = Cesium.Math.toDegrees(viewer.camera.heading);
    const pitch = Cesium.Math.toDegrees(viewer.camera.pitch);
    const fov = Cesium.Math.toDegrees(viewer.camera.frustum.fov);

    panorama.setPov({
        pan: heading,
        tilt: pitch,
        fov: fov
    });

    viewer.scene.requestRender();

    setTimeout(() => { isCesiumUpdating = false; }, 50);
});

// [B] Naver Panorama -> Cesium Camera 동기화
// 1) 시점(POV) 변경 이벤트 (마우스 드래그)
panorama.addListener('pov_changed', function () {
    if (isCesiumUpdating) return;
    isNaverUpdating = true;

    const pov = panorama.getPov();
    const heading = Cesium.Math.toRadians(pov.pan);
    const pitch = Cesium.Math.toRadians(pov.tilt);
    const fov = Cesium.Math.toRadians(pov.fov);

    if (fov > 0 && fov < Math.PI) {
        viewer.camera.frustum.fov = fov;
    }

    viewer.camera.setView({
        orientation: {
            heading: heading,
            pitch: pitch,
            roll: 0.0
        }
    });

    viewer.scene.requestRender();

    setTimeout(() => { isNaverUpdating = false; }, 50);
});

// 2) 위치 변경 이벤트 (도로의 화살표 클릭)
panorama.addListener('pano_changed', function () {
    if (isCesiumUpdating) return;
    isNaverUpdating = true;

    const navPos = panorama.getPosition();
    const currentHeight = viewer.camera.positionCartographic.height;

    viewer.camera.flyTo({
        destination: Cesium.Cartesian3.fromDegrees(navPos.lng(), navPos.lat(), currentHeight),
        orientation: {
            heading: viewer.camera.heading,
            pitch: viewer.camera.pitch,
            roll: 0.0
        },
        duration: 0.5
    });

    setTimeout(() => { isNaverUpdating = false; }, 550);
});

// 최초 렌더 트리거
viewer.scene.requestRender();

