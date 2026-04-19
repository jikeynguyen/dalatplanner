export interface Location {
  name: string;
  coords: { lat: number; lng: number };
  time: string;
  desc: string;
}

export interface DayPlan {
  date: string;
  title: string;
  locations: Location[];
}

export const itinerary: DayPlan[] = [
  {
    date: "26/04",
    title: "Ngày 1: Chào Đà Lạt",
    locations: [
      { name: "Phê Thạch (Start)", coords: { lat: 11.949347, lng: 108.431673 }, time: "14:00", desc: "Check-in & Nghỉ ngơi tại G1 - 01" },
      { name: "Chợ Đà Lạt", coords: { lat: 11.9424, lng: 108.4378 }, time: "18:00", desc: "Ăn tối & Dạo phố đêm" },
      { name: "Hồ Xuân Hương", coords: { lat: 11.9416, lng: 108.4411 }, time: "20:00", desc: "Ngắm cảnh đêm & Cafe" }
    ]
  },
  {
    date: "27/04",
    title: "Ngày 2: Chinh phục Cao nguyên",
    locations: [
      { name: "Langbiang", coords: { lat: 12.0433, lng: 108.4397 }, time: "08:00", desc: "Leo núi & Ngắm toàn cảnh" },
      { name: "Thung Lũng Tình Yêu", coords: { lat: 11.9772, lng: 108.4503 }, time: "13:30", desc: "Tham quan & Chụp ảnh" },
      { name: "Làng Hoa Vạn Thành", coords: { lat: 11.9444, lng: 108.4111 }, time: "16:00", desc: "Ngắm hoa & Trải nghiệm nông nghiệp" }
    ]
  },
  {
    date: "28/04",
    title: "Ngày 3: Sương mù Tuyền Lâm",
    locations: [
      { name: "Hồ Tuyền Lâm", coords: { lat: 11.8956, lng: 108.4371 }, time: "07:30", desc: "Chèo thuyền & Ngắm cảnh" },
      { name: "Thiền Viện Trúc Lâm", coords: { lat: 11.9022, lng: 108.4358 }, time: "09:30", desc: "Vãn cảnh chùa" },
      { name: "Đường Hầm Điêu Khắc", coords: { lat: 11.8906, lng: 108.4231 }, time: "14:00", desc: "Khám phá kiến trúc đất sét" }
    ]
  },
  {
    date: "29/04",
    title: "Ngày 4: Tạm biệt Đà Lạt",
    locations: [
      { name: "Dinh I Bảo Đại", coords: { lat: 11.9333, lng: 108.4583 }, time: "08:30", desc: "Tìm hiểu lịch sử" },
      { name: "Cafe Still Cafe", coords: { lat: 11.9400, lng: 108.4500 }, time: "10:30", desc: "Thưởng thức cafe phong cách Nhật" },
      { name: "Phê Thạch (End)", coords: { lat: 11.949347, lng: 108.431673 }, time: "13:00", desc: "Thu dọn hành lý & Kết thúc" }
    ]
  }
];

export const startPoint = {
  name: "G1 - 01, Phê Thạch",
  coords: { lat: 11.949347, lng: 108.431673 },
  description: "Điểm tập kết / Cổng nhà thờ Du Sinh"
};
