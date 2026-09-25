// === CUSTOMER UI (giao diện gốc giữ nguyên — dữ liệu lấy từ REST API thật) ===
let currentCustomer = JSON.parse(sessionStorage.getItem('HoangAn_CUSTOMER') || 'null');
let hotelConfig = null;

const goAdmin = () => { window.location.href = '/portal/'; };

const getHotelConfig = async () => {
    if (hotelConfig) return hotelConfig;
    try {
        const res = await API.get('/config/public', { auth: false });
        hotelConfig = res.data || {};
    } catch {
        hotelConfig = {};
    }
    return hotelConfig;
};

const bookingStatusBadge = (status) => {
    const map = {
        ChoXacNhan: ['Chờ xác nhận', 'bg-yellow-100 text-yellow-800'],
        DaDat: ['Sắp tới', 'bg-blue-100 text-blue-800'],
        DangO: ['Đang ở', 'bg-green-100 text-green-800'],
        DaTra: ['Đã hoàn thành', 'bg-gray-100 text-gray-800'],
        Huy: ['Đã hủy', 'bg-red-100 text-red-800'],
        NoShow: ['Vắng mặt', 'bg-orange-100 text-orange-800'],
    };
    const info = map[status];
    if (!info) return `<span class="bg-gray-100 text-gray-800 px-3 py-1 rounded-full text-sm font-medium">${escapeHtml(status)}</span>`;
    return `<span class="${info[1]} px-3 py-1 rounded-full text-sm font-medium">${t(info[0])}</span>`;
};

const renderCustomerApp = () => {
    const root = document.getElementById('app-root');
    document.body.className = ''; // reset to light mode

    root.innerHTML = `
        <!-- Navbar -->
        <nav class="bg-[#003b95] sticky top-0 z-40 shadow-lg transition-all duration-300">
            <div class="max-w-7xl mx-auto px-4 py-3 flex justify-between items-center">
                <div class="flex items-center gap-10">
                    <!-- Logo -->
                    <a href="#" onclick="updateNav('home'); renderHome()" class="flex items-center group">
                        <img src="./src/assets/images/logo.png" class="h-10 inline-block rounded-full border-2 border-white/20 mr-3 shadow-sm group-hover:rotate-12 transition duration-300" alt="HoangAn Hotel">
                        <div class="logo-text group-hover:scale-105 transition-transform duration-300 origin-left">
                            HoangAn
                            <span class="com-badge">.vn</span>
                        </div>
                    </a>

                    <!-- Main Nav -->
                    <div class="hidden lg:flex gap-6 items-center text-base pt-1" id="main-nav-links">
                        <a href="#" onclick="updateNav('home'); renderHome()" data-target="home" class="nav-link active">${t('Khách sạn')}</a>
                        <a href="#" onclick="updateNav('tour'); renderRoomList()" data-target="tour" class="nav-link">Tour</a>
                        <a href="#" onclick="updateNav('lookup'); renderLookupPage()" data-target="lookup" class="nav-link">${t('Tra cứu')}</a>
                        <a href="#" class="nav-link">Vé máy bay</a>
                        <a href="#" class="nav-link">Vé tàu</a>
                        <a href="#" class="nav-link text-xl hover:text-orange-400"><i class="fas fa-ellipsis-h"></i></a>
                    </div>
                </div>

                <!-- Right section: User & Phone -->
                <div class="flex items-center gap-8">
                    <!-- User Login/Profile -->
                    ${currentCustomer ? `
                        <div class="relative cursor-pointer py-2" id="customerAccountWrapper">
                            <div class="flex items-center gap-2 font-bold text-white hover:text-[#00b6f3] transition" onclick="toggleCustomerAccountMenu(event)">
                                <i class="fas fa-user-circle text-2xl border-2 border-white/30 rounded-full"></i>
                                <span class="text-sm hidden sm:inline">${escapeHtml(currentCustomer.ho_ten)}</span>
                                <i class="fas fa-chevron-down text-xs ml-1 transition-transform" id="customerAccountChevron"></i>
                            </div>
                            <div class="absolute right-0 top-full pt-2 w-56 hidden z-50" id="customerAccountMenu">
                                <div class="bg-white rounded-xl shadow-2xl border border-gray-100 overflow-hidden text-gray-800 font-medium text-sm">
                                    <a href="#" onclick="closeCustomerAccountMenu(); renderCustomerProfile()" class="block px-4 py-3 hover:bg-blue-50 hover:text-blue-600 transition"><i class="fas fa-id-card w-5 mr-2 text-center text-gray-400"></i>${t('Hồ sơ của tôi')}</a>
                                    <a href="#" onclick="closeCustomerAccountMenu(); renderCustomerBookings()" class="block px-4 py-3 hover:bg-blue-50 hover:text-blue-600 transition"><i class="fas fa-list-alt w-5 mr-2 text-center text-gray-400"></i>${t('Lịch sử đặt phòng')}</a>
                                    <a href="#" onclick="closeCustomerAccountMenu(); logoutCustomer()" class="block px-4 py-3 hover:bg-red-50 text-red-600 border-t border-gray-100 transition"><i class="fas fa-sign-out-alt w-5 mr-2 text-center"></i>${t('Đăng xuất')}</a>
                                </div>
                            </div>
                        </div>
                    ` : `
                        <div class="flex items-center gap-2 font-bold text-white hover:text-[#00b6f3] transition cursor-pointer group" onclick="showCustomerLogin()">
                            <i class="fas fa-user-circle text-2xl border-2 border-transparent group-hover:border-[#00b6f3] rounded-full transition-colors"></i>
                            <span class="text-sm">${t('Đăng nhập')}</span>
                            <i class="fas fa-chevron-down text-xs ml-1"></i>
                        </div>
                    `}

                    <!-- Language toggle (NFR đa ngôn ngữ VI/EN) -->
                    <div class="hidden sm:block">
                        ${langToggle()}
                    </div>

                    <!-- Phone Hotline -->
                    <div class="hidden md:flex items-center gap-3 border-l border-white/20 pl-8">
                        <i class="fas fa-phone-alt text-[#f97316] text-2xl hover:rotate-12 transition-transform"></i>
                        <div class="flex flex-col text-left justify-center leading-none">
                            <span class="text-[#f97316] font-black text-xl tracking-wide">1900 6868</span>
                            <span class="text-[10px] text-white/80 font-medium mt-1 flex items-center gap-1"><i class="far fa-clock text-[9px]"></i> 7h30 &rarr; 21h</span>
                        </div>
                    </div>
                </div>
            </div>
        </nav>

        <!-- Dynamic Content -->
        <div id="customer-content"></div>


        <!-- Footer -->
        <footer class="bg-white pt-16 pb-8 border-t border-gray-200 mt-20">
            <div class="max-w-7xl mx-auto px-4">
                <div class="grid grid-cols-1 md:grid-cols-5 gap-8 mb-12 text-gray-700 text-sm">
                    <!-- Col 1 -->
                    <div>
                        <h3 class="font-bold mb-4 text-gray-900 text-base">Về HoangAn.vn</h3>
                        <ul class="space-y-3">
                            <li><a href="#" class="hover:text-blue-600 transition">Về chúng tôi</a></li>
                            <li><a href="#" class="hover:text-blue-600 transition">HoangAn Blog</a></li>
                        </ul>
                    </div>

                    <!-- Col 2 -->
                    <div>
                        <h3 class="font-bold mb-4 text-gray-900 text-base">Thông tin cần biết</h3>
                        <ul class="space-y-3">
                            <li><a href="#" class="hover:text-blue-600 transition">Điều kiện & Điều khoản</a></li>
                            <li><a href="#" class="hover:text-blue-600 transition">Quy chế hoạt động</a></li>
                            <li><a href="#" class="hover:text-blue-600 transition">Câu hỏi thường gặp</a></li>
                        </ul>
                    </div>

                    <!-- Col 3 -->
                    <div>
                        <h3 class="font-bold mb-4 text-gray-900 text-base">Đối tác</h3>
                        <ul class="space-y-3">
                            <li><a href="#" class="hover:text-blue-600 transition">Quy chế bảo hiểm</a></li>
                            <li><a href="#" class="hover:text-blue-600 transition">Yêu cầu bồi thường</a></li>
                            <li><a href="#" class="hover:text-blue-600 transition">Quy chế trả góp</a></li>
                        </ul>
                    </div>

                    <!-- Col 4 -->
                    <div>
                        <h3 class="font-bold mb-4 text-gray-900 text-base">Thành viên của</h3>
                        <div class="flex items-center gap-2 font-bold text-blue-900 text-3xl">
                            <i class="fas fa-globe-americas"></i> TMG
                        </div>
                        <p class="text-xs text-gray-500 mt-1 italic font-medium">Inspiring People</p>
                    </div>

                    <!-- Col 5 -->
                    <div>
                        <h3 class="font-bold mb-4 text-gray-900 text-base text-center md:text-left">Được chứng nhận</h3>
                        <div class="flex gap-4 items-center justify-center md:justify-start">
                            <div class="bg-red-600 text-white text-[10px] font-bold px-2 py-1 rounded flex items-center gap-1 shadow">
                                <i class="fas fa-check-circle text-sm"></i> ĐÃ ĐĂNG KÝ BỘ CÔNG THƯƠNG
                            </div>
                            <div class="w-12 h-12 rounded-full border-2 border-blue-900 flex items-center justify-center text-blue-900 font-bold text-xs shadow-sm">
                                IATA
                            </div>
                        </div>
                    </div>
                </div>

                <div class="border-t border-gray-200 py-8 flex flex-col lg:flex-row justify-between gap-12">
                    <!-- Left: Awards and Address -->
                    <div class="flex-1">
                        <div class="flex flex-wrap gap-8 mb-8">
                            <div class="flex items-center gap-3">
                                <i class="fas fa-award text-yellow-500 text-4xl"></i>
                                <span class="text-xs font-bold text-gray-700 w-40">Đại lý Du lịch trực tuyến hàng đầu Việt Nam</span>
                            </div>
                            <div class="flex items-center gap-3">
                                <i class="fas fa-trophy text-gray-700 text-4xl"></i>
                                <span class="text-xs font-bold text-gray-700 w-32">Nơi làm việc tốt nhất Châu Á</span>
                            </div>
                            <div class="flex items-center gap-3">
                                <i class="fas fa-medal text-gray-400 text-4xl"></i>
                                <span class="text-xs font-bold text-gray-700 w-32">Thương hiệu truyền cảm hứng APEA</span>
                            </div>
                        </div>

                        <div class="text-sm text-gray-600 space-y-3 mb-8 fade-in">
                            <p class="font-bold text-gray-800">DKKD: 8888999900, Ngày cấp: 09/09/2026, Sở kế hoạch đầu tư thành phố Hồ Chí Minh</p>
                            <p class="flex items-start gap-2 group cursor-default"><i class="fas fa-map-marker-alt text-gray-400 mt-1 w-4 text-center group-hover:text-blue-500 transition"></i> <span><b>Trụ sở chính:</b> Tầng 88, Tòa tháp Ánh Sáng, Khu đô thị mới Thủ Thiêm, TP.Thủ Đức, TP.Hồ Chí Minh</span></p>
                            <p class="flex items-start gap-2 group cursor-default"><i class="fas fa-map-marker-alt text-gray-400 mt-1 w-4 text-center group-hover:text-blue-500 transition"></i> <span><b>Chi nhánh Biển:</b> 123 Đại lộ San Hô, Phường Bãi Cháy, TP.Hạ Long, Quảng Ninh</span></p>
                            <p class="flex items-start gap-2 group cursor-default"><i class="fas fa-map-marker-alt text-gray-400 mt-1 w-4 text-center group-hover:text-blue-500 transition"></i> <span><b>Chi nhánh Núi:</b> Biệt thự mây trắng số 9, Đỉnh đồi Robin, TP.Đà Lạt, Lâm Đồng</span></p>
                        </div>

                        <div class="flex gap-3 items-center">
                            <a href="#" class="w-10 h-10 rounded-full bg-[#0068ff] text-white flex items-center justify-center hover:-translate-y-1 transition duration-300 shadow-md"><span class="text-xs font-bold">Zalo</span></a>
                            <a href="#" class="w-10 h-10 rounded-full bg-[#1877f2] text-white flex items-center justify-center hover:-translate-y-1 transition duration-300 shadow-md"><i class="fab fa-facebook-f text-lg"></i></a>
                            <a href="#" class="w-10 h-10 rounded-full bg-gradient-to-tr from-[#fd5949] to-[#d6249f] text-white flex items-center justify-center hover:-translate-y-1 transition duration-300 shadow-md"><i class="fab fa-instagram text-lg"></i></a>
                            <a href="#" class="w-10 h-10 rounded-full bg-[#ff0000] text-white flex items-center justify-center hover:-translate-y-1 transition duration-300 shadow-md"><i class="fab fa-youtube text-lg"></i></a>
                            <a href="#" class="w-10 h-10 rounded-full bg-black text-white flex items-center justify-center hover:-translate-y-1 transition duration-300 shadow-md"><i class="fab fa-tiktok text-lg"></i></a>
                            <a href="#" class="w-10 h-10 rounded-full bg-[#00a2e8] text-white flex items-center justify-center hover:-translate-y-1 transition duration-300 shadow-md"><i class="fas fa-envelope text-lg"></i></a>
                        </div>
                    </div>

                    <!-- Right: Contact -->
                    <div class="lg:w-80 border-l border-gray-100 pl-0 lg:pl-12 pt-8 lg:pt-0">
                        <h3 class="font-bold text-gray-800 mb-4 text-lg">Bạn cần trợ giúp? Hãy gọi ngay</h3>

                        <div class="flex items-center gap-3 mb-6">
                            <i class="fas fa-phone-alt text-orange-500 text-3xl"></i>
                            <div>
                                <div class="text-orange-500 font-bold text-3xl leading-none">1900 6868</div>
                                <div class="text-xs text-gray-500 mt-1"><i class="far fa-clock mr-1"></i>7h30 &rarr; 21h</div>
                            </div>
                        </div>

                        <div class="flex items-center gap-3 mb-8 cursor-pointer group">
                            <div class="w-10 h-10 rounded-full bg-[#7360f2] text-white flex items-center justify-center group-hover:scale-110 transition shadow"><i class="fab fa-viber text-xl"></i></div>
                            <span class="font-bold text-[#7360f2] text-lg">HoangAn Viber</span>
                        </div>



                        <div class="bg-gray-50 p-4 rounded-xl border border-gray-100">
                            <p class="text-sm text-gray-800 font-bold mb-3 text-center">Quét mã QR tải ứng dụng ngay</p>
                            <div class="flex gap-4 items-center justify-center">
                                <div class="w-24 h-24 bg-white border border-gray-200 flex items-center justify-center shadow-sm p-1 rounded-lg">
                                    <i class="fas fa-qrcode text-6xl text-gray-800"></i>
                                </div>
                                <div class="space-y-3">
                                    <div class="bg-black text-white px-3 py-2 rounded-lg flex items-center gap-2 cursor-pointer hover:bg-gray-800 transition">
                                        <i class="fab fa-apple text-2xl"></i>
                                        <div class="leading-none">
                                            <div class="text-[9px] mb-1 text-gray-300">Tải về trên</div>
                                            <div class="text-sm font-bold">App Store</div>
                                        </div>
                                    </div>
                                    <div class="bg-black text-white px-3 py-2 rounded-lg flex items-center gap-2 cursor-pointer hover:bg-gray-800 transition">
                                        <i class="fab fa-google-play text-xl"></i>
                                        <div class="leading-none">
                                            <div class="text-[9px] mb-1 text-gray-300">Tải về trên</div>
                                            <div class="text-sm font-bold">Google Play</div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                        <div class="mt-8 pt-6 border-t border-gray-200 text-center">
                            <button onclick="goAdmin()" class="text-gray-400 hover:text-blue-600 transition text-sm flex items-center justify-center w-full mx-auto"><i class="fas fa-lock mr-2"></i> Đăng nhập Quản trị viên</button>
                        </div>
                    </div>
                </div>
            </div>
        </footer>

    `;

    renderHome();
};

const renderHome = async () => {
    document.getElementById('customer-content').innerHTML = `
        <!-- Hero Section -->
        <div class="relative min-h-[500px] flex items-center bg-gray-900 overflow-hidden fade-in">
            <img src="https://images.unsplash.com/photo-1540541338287-41700207dee6?auto=format&fit=crop&w=1920&q=80" class="absolute inset-0 w-full h-full object-cover" alt="Hotel">
            <div class="absolute inset-0 bg-gradient-to-r from-black/70 via-black/30 to-transparent"></div>
            <div class="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent"></div>

            <div class="relative z-20 px-4 max-w-7xl mx-auto w-full flex flex-col md:flex-row justify-between items-center gap-8 py-12 mt-4">
                <div class="text-white w-full lg:w-2/3 text-left">
                    <h1 class="text-4xl md:text-5xl font-bold mb-4 drop-shadow-md">${t('Trải nghiệm kỳ nghỉ tuyệt vời')}</h1>
                    <p class="text-lg md:text-xl mb-8 text-white/90 font-medium">${t('Combo khách sạn - nghỉ dưỡng đẳng cấp giá tốt nhất')}</p>

                    <!-- Search Box -->
                    <div class="bg-white p-2 rounded-xl shadow-2xl flex flex-col md:flex-row gap-2 items-center text-gray-800 w-full">
                        <div class="flex-1 w-full flex items-center px-4 py-3 border-b md:border-b-0 md:border-r border-gray-200">
                            <i class="fas fa-search text-gray-400 mr-3 text-lg"></i>
                            <input type="text" placeholder="${t('Bạn muốn đi đâu?')}" class="w-full font-medium border-none outline-none text-gray-800 bg-transparent placeholder-gray-500 text-lg">
                        </div>
                        <div class="flex-1 w-full flex items-center px-4 py-3 border-b md:border-b-0 md:border-r border-gray-200">
                            <i class="far fa-calendar-alt text-gray-400 mr-3 text-lg"></i>
                            <div class="flex gap-2 items-center w-full">
                                <div class="flex flex-col">
                                    <span class="text-[10px] text-gray-500 uppercase font-bold">${t('Ngày đi')}</span>
                                    <input type="date" id="home-checkin" class="w-full text-sm font-bold border-none outline-none text-gray-800 bg-transparent p-0">
                                </div>
                                <i class="fas fa-moon text-gray-300 text-xs mx-1"></i>
                                <div class="flex flex-col">
                                    <span class="text-[10px] text-gray-500 uppercase font-bold">${t('Ngày về')}</span>
                                    <input type="date" id="home-checkout" class="w-full text-sm font-bold border-none outline-none text-gray-800 bg-transparent p-0">
                                </div>
                            </div>
                        </div>
                        <div class="flex-1 w-full flex items-center px-4 py-3">
                            <i class="fas fa-user-friends text-gray-400 mr-3 text-lg"></i>
                            <div class="flex flex-col text-left cursor-pointer">
                                <span class="text-sm font-bold text-gray-800">${t('1 Phòng')}</span>
                                <span class="text-xs text-gray-500">${t('2 người lớn, 0 trẻ em')}</span>
                            </div>
                        </div>
                        <button onclick="handleSearchRooms()" class="bg-orange-500 hover:bg-orange-600 text-white font-bold text-lg px-8 py-4 rounded-lg w-full md:w-auto transition shadow-md">${t('Tìm')}</button>
                    </div>
                </div>

                <div class="hidden lg:block w-full lg:w-1/3 pl-8">
                    <div class="text-white text-right flex flex-col items-end">
                        <span class="text-xs uppercase tracking-widest mb-1 text-white/90 font-bold">Combo 3N2Đ</span>
                        <h3 class="text-2xl font-bold mb-2 uppercase drop-shadow-md">HoangAn HotelS ĐÀ NẴNG</h3>
                        <p class="text-sm mb-4 text-white/90 text-right max-w-[280px]">Nghỉ dưỡng hạng sang - Tặng kèm 1 suất Spa và Buffet sáng miễn phí</p>
                        <div class="flex items-center gap-3">
                            <div class="text-right">
                                <span class="text-orange-500 font-bold text-3xl">4.899.000<span class="text-lg underline ml-1">đ</span><span class="text-sm text-white font-normal">/khách</span></span>
                            </div>
                            <div class="w-10 h-10 rounded-full bg-blue-900/60 backdrop-blur border border-white/20 flex items-center justify-center hover:bg-blue-800 cursor-pointer transition shadow-xl">
                                <i class="fas fa-chevron-right"></i>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>

        <!-- Featured Rooms -->
        <div class="max-w-7xl mx-auto px-4 py-20 fade-in">
            <div class="text-center mb-16">
                <h2 class="text-3xl md:text-4xl font-bold text-gray-800 mb-4">${t('Các Hạng Phòng Nổi Bật')}</h2>
                <div class="w-24 h-1 bg-gradient-to-r from-indigo-500 to-purple-600 mx-auto rounded-full"></div>
            </div>

            <div class="grid grid-cols-1 md:grid-cols-3 gap-8" id="featured-rooms-container">
                <div class="col-span-3 text-center text-gray-400 py-8"><i class="fas fa-spinner fa-spin text-2xl mr-2"></i> ${t('Đang tải danh sách phòng…')}</div>
            </div>

            <div class="text-center mt-12">
                <button onclick="updateNav('tour'); renderRoomList()" class="px-8 py-3 border-2 border-indigo-600 text-indigo-600 font-bold rounded-full hover:bg-indigo-600 hover:text-white transition">${t('Xem Tất Cả Phòng')}</button>
            </div>
        </div>

        <div class="py-20 bg-gray-50 px-4">
            <div class="max-w-7xl mx-auto">
                <div class="text-center mb-16">
                    <h2 class="text-3xl md:text-4xl font-bold mb-4 text-gray-800">Dịch Vụ Đẳng Cấp 5 Sao</h2>
                    <p class="text-gray-500 max-w-2xl mx-auto">Trải nghiệm những tiện ích tuyệt vời nhất được thiết kế riêng để mang lại sự thư giãn tuyệt đối cho kỳ nghỉ của bạn tại HoangAn Hotel.</p>
                </div>
                <div class="grid grid-cols-1 md:grid-cols-4 gap-8 text-center">
                    <div class="bg-white p-8 rounded-2xl shadow hover:shadow-lg transition">
                        <div class="w-16 h-16 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-2xl mx-auto mb-6"><i class="fas fa-swimming-pool"></i></div>
                        <h3 class="text-xl font-bold mb-3">Hồ bơi vô cực</h3>
                        <p class="text-gray-500 text-sm">Hồ bơi view biển ngoài trời với nhiệt độ nước được điều chỉnh lý tưởng.</p>
                    </div>
                    <div class="bg-white p-8 rounded-2xl shadow hover:shadow-lg transition">
                        <div class="w-16 h-16 bg-rose-100 text-rose-600 rounded-full flex items-center justify-center text-2xl mx-auto mb-6"><i class="fas fa-spa"></i></div>
                        <h3 class="text-xl font-bold mb-3">Spa & Massage</h3>
                        <p class="text-gray-500 text-sm">Liệu pháp thư giãn chuyên sâu phục hồi sức khỏe thể chất và tinh thần.</p>
                    </div>
                    <div class="bg-white p-8 rounded-2xl shadow hover:shadow-lg transition">
                        <div class="w-16 h-16 bg-amber-100 text-amber-600 rounded-full flex items-center justify-center text-2xl mx-auto mb-6"><i class="fas fa-utensils"></i></div>
                        <h3 class="text-xl font-bold mb-3">Nhà hàng & Bar</h3>
                        <p class="text-gray-500 text-sm">Thưởng thức ẩm thực Á-Âu thượng hạng và những ly cocktail tuyệt hảo.</p>
                    </div>
                    <div class="bg-white p-8 rounded-2xl shadow hover:shadow-lg transition">
                        <div class="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center text-2xl mx-auto mb-6"><i class="fas fa-dumbbell"></i></div>
                        <h3 class="text-xl font-bold mb-3">Phòng Gym 24/7</h3>
                        <p class="text-gray-500 text-sm">Trang thiết bị tập luyện hiện đại đạt chuẩn quốc tế luôn mở cửa.</p>
                    </div>
                </div>
            </div>
        </div>
    `;

    // Populate featured rooms (từ API — chỉ loại phòng đang công bố)
    const container = document.getElementById('featured-rooms-container');
    try {
        const res = await API.get('/room-types', { auth: false });
        const roomTypes = (res.data || []).slice(0, 3);
        container.innerHTML = roomTypes.map(rt => `
            <div class="bg-white rounded-2xl overflow-hidden shadow-lg hover:shadow-2xl transition transform hover:-translate-y-2 border border-gray-100">
                <div class="h-64 relative bg-cover bg-center" style="background-image: url('${escapeHtml(rt.hinh_anh || 'https://images.unsplash.com/photo-1566665797739-1674de7a421a?auto=format&fit=crop&w=800&q=80')}')">
                    <div class="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent flex items-end p-6">
                        <h3 class="text-white text-2xl font-bold drop-shadow-md">${escapeHtml(rt.ten_loai_phong)}</h3>
                    </div>
                </div>
                <div class="p-6">
                    <p class="text-gray-500 mb-4 line-clamp-2 h-12">${escapeHtml(rt.mo_ta || '')}</p>
                    <div class="flex justify-between items-center mt-6">
                        <div>
                            <p class="text-xs text-gray-400 uppercase font-bold tracking-wide">${t('Giá từ')}</p>
                            <p class="text-xl font-bold text-indigo-600">${formatMoney(num(rt.gia_mac_dinh))} <span class="text-sm font-normal text-gray-500">/đêm</span></p>
                        </div>
                        <button onclick="showBookingForm('${rt.id}')" class="bg-gray-900 text-white px-5 py-2 rounded-lg font-medium hover:bg-indigo-600 transition">${t('Đặt ngay')}</button>
                    </div>
                </div>
            </div>
        `).join('');
        if (!roomTypes.length) container.innerHTML = '<div class="col-span-3 text-center text-gray-500 py-8">Chưa có loại phòng nào được công bố.</div>';
    } catch (err) {
        container.innerHTML = `<div class="col-span-3 text-center text-gray-500 py-8">${escapeHtml(err.message)} <button onclick="renderHome()" class="text-indigo-600 font-medium underline ml-2">Thử lại</button></div>`;
    }

    // Set default dates
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    document.getElementById('home-checkin').valueAsDate = today;
    document.getElementById('home-checkin').min = today.toISOString().split('T')[0];
    document.getElementById('home-checkout').valueAsDate = tomorrow;
};

// Ensure check-out is after check-in
document.addEventListener('change', (e) => {
    if (e.target.id === 'home-checkin' || e.target.id === 'search-checkin') {
        const checkin = new Date(e.target.value);
        const checkoutInput = document.getElementById(e.target.id.replace('checkin', 'checkout'));
        if (checkoutInput) {
            const minCheckout = new Date(checkin);
            minCheckout.setDate(minCheckout.getDate() + 1);
            checkoutInput.min = minCheckout.toISOString().split('T')[0];
            if (new Date(checkoutInput.value) <= checkin) {
                checkoutInput.valueAsDate = minCheckout;
            }
        }
    }
});

const renderRoomList = async (availableTypes = null) => {
    document.getElementById('customer-content').innerHTML = `
        <div class="bg-gray-100 py-12">
            <div class="max-w-7xl mx-auto px-4">
                <div class="bg-white rounded-2xl shadow-md p-6 mb-10 flex flex-wrap gap-4 items-end">
                    <div class="flex-1 min-w-[200px]">
                        <label class="block text-sm font-medium text-gray-700 mb-1">${t('Nhận phòng')}</label>
                        <input type="date" id="search-checkin" class="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary outline-none">
                    </div>
                    <div class="flex-1 min-w-[200px]">
                        <label class="block text-sm font-medium text-gray-700 mb-1">${t('Trả phòng')}</label>
                        <input type="date" id="search-checkout" class="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary outline-none">
                    </div>
                    <button onclick="handleSearchRooms()" class="bg-gray-900 text-white px-8 py-3 rounded-lg font-medium hover:bg-primary transition w-full md:w-auto h-[50px]">
                        <i class="fas fa-search mr-2"></i>${t('Tìm')}
                    </button>
                </div>

                <h2 class="text-3xl font-bold mb-8">${availableTypes ? t('Danh sách phòng (Khả dụng)') : t('Danh sách phòng')}</h2>

                <div class="grid grid-cols-1 gap-8" id="room-list-container">
                    <div class="text-center text-gray-400 py-8"><i class="fas fa-spinner fa-spin text-2xl mr-2"></i> Đang tải…</div>
                </div>
            </div>
        </div>
    `;

    // Set date inputs to match global state if available
    const ci = document.getElementById('search-checkin');
    const co = document.getElementById('search-checkout');
    const today = new Date().toISOString().split('T')[0];
    const tomorrowD = new Date(); tomorrowD.setDate(tomorrowD.getDate() + 1);
    const tomorrow = tomorrowD.toISOString().split('T')[0];
    if (ci) { ci.min = today; ci.value = window.tempCheckIn || today; }
    if (co) {
        co.min = tomorrow;
        co.value = window.tempCheckOut || tomorrow;
    }

    let types = availableTypes;
    if (!types) {
        // Không có kết quả tìm kiếm → hiển thị tất cả loại phòng (giá niêm yết)
        try {
            const res = await API.get('/room-types', { auth: false });
            types = res.data || [];
        } catch (err) {
            document.getElementById('room-list-container').innerHTML =
                `<div class="text-center text-gray-500 py-12">${escapeHtml(err.message)}</div>`;
            return;
        }
    }

    document.getElementById('room-list-container').innerHTML = types.map(rt => `
        <div class="bg-white rounded-2xl overflow-hidden shadow flex flex-col md:flex-row border border-gray-100">
            <div class="md:w-1/3 h-64 md:h-auto relative bg-cover bg-center" style="background-image: url('${escapeHtml(rt.hinh_anh || 'https://images.unsplash.com/photo-1566665797739-1674de7a421a?auto=format&fit=crop&w=800&q=80')}')">
            </div>
            <div class="p-8 md:w-2/3 flex flex-col justify-between">
                <div>
                    <div class="flex justify-between items-start">
                        <h3 class="text-2xl font-bold text-gray-800 mb-2">${escapeHtml(rt.ten_loai_phong)}</h3>
                        <p class="text-2xl font-bold text-indigo-600">${formatMoney(num(rt.gia_mac_dinh))}<span class="text-sm font-normal text-gray-500">/đêm</span></p>
                    </div>
                    <p class="text-gray-600 mb-6">${escapeHtml(rt.mo_ta || '')}</p>

                    <div class="flex flex-wrap gap-3 mb-6">
                        <span class="px-3 py-1 bg-gray-100 text-gray-600 rounded-full text-sm"><i class="fas fa-wifi mr-1"></i> Free Wifi</span>
                        <span class="px-3 py-1 bg-gray-100 text-gray-600 rounded-full text-sm"><i class="fas fa-tv mr-1"></i> TV</span>
                        <span class="px-3 py-1 bg-gray-100 text-gray-600 rounded-full text-sm"><i class="fas fa-bath mr-1"></i> Bồn tắm</span>
                        <span class="px-3 py-1 bg-gray-100 text-gray-600 rounded-full text-sm"><i class="fas fa-wind mr-1"></i> Điều hòa</span>
                        ${rt.so_phong_trong != null ? `<span class="px-3 py-1 bg-green-50 text-green-700 rounded-full text-sm"><i class="fas fa-door-open mr-1"></i> ${rt.so_phong_trong} ${t('phòng trống')}</span>` : ''}
                    </div>
                </div>
                <div class="flex justify-end">
                    <button onclick="showBookingForm('${rt.id}')" class="bg-gradient-to-r from-indigo-500 to-purple-600 text-white px-8 py-3 rounded-lg font-bold hover:shadow-lg transition">
                        ${t('Đặt Phòng')}
                    </button>
                </div>
            </div>
        </div>
    `).join('') + (types.length === 0 ? `<div class="text-center py-12 text-gray-500 text-lg">${t('Không tìm thấy loại phòng nào trống trong thời gian này.')}</div>` : '');
};

const handleSearchRooms = async () => {
    const checkin = document.getElementById('home-checkin') ? document.getElementById('home-checkin').value : document.getElementById('search-checkin').value;
    const checkout = document.getElementById('home-checkout') ? document.getElementById('home-checkout').value : document.getElementById('search-checkout').value;

    if (!checkin || !checkout) return showToast('Vui lòng chọn ngày', 'warning');
    if (new Date(checkout) <= new Date(checkin)) return showToast('Ngày trả phòng phải sau ngày nhận', 'warning');

    window.tempCheckIn = checkin;
    window.tempCheckOut = checkout;

    // Tìm phòng trống theo khoảng ngày trên server (nguồn dữ liệu thật, chống overlap).
    try {
        const res = await API.get(`/rooms/vacant?check_in=${encodeURIComponent(checkin)}&check_out=${encodeURIComponent(checkout)}`, { auth: false });
        const vacantRooms = res.data || [];

        // Gom phòng trống theo loại phòng để hiển thị như danh sách loại phòng
        const typesById = new Map();
        for (const room of vacantRooms) {
            if (!typesById.has(room.loai_phong_id)) {
                typesById.set(room.loai_phong_id, {
                    id: room.loai_phong_id,
                    ten_loai_phong: room.ten_loai_phong,
                    mo_ta: room.mo_ta,
                    gia_mac_dinh: room.gia_mac_dinh,
                    hinh_anh: room.hinh_anh,
                    suc_chua: room.suc_chua,
                    so_phong_trong: 0,
                    room_ids: [],
                });
            }
            const t = typesById.get(room.loai_phong_id);
            t.so_phong_trong += 1;
            t.room_ids.push(room.id);
        }
        window.vacantByType = Object.fromEntries(
            [...typesById.values()].map(t => [String(t.id), t.room_ids])
        );
        updateNav('tour');
        renderRoomList([...typesById.values()]);
    } catch (err) {
        showToast(err.message, 'error');
    }
};

const showBookingForm = async (typeId) => {
    // Lấy thông tin loại phòng từ API (nguồn giá/mô tả thật)
    let type = null;
    try {
        const res = await API.get(`/room-types/${typeId}`, { auth: false });
        type = res.data;
    } catch (err) {
        return showToast(err.message, 'error');
    }

    const ci = window.tempCheckIn || new Date().toISOString().split('T')[0];
    const tomorrow = new Date(); tomorrow.setDate(tomorrow.getDate() + 1);
    const co = window.tempCheckOut || tomorrow.toISOString().split('T')[0];

    const days = Math.max(1, (new Date(co) - new Date(ci)) / (1000 * 60 * 60 * 24));
    const total = days * num(type.gia_mac_dinh);
    window.currentBookingContext = { typeId, ci, co, days, total };

    const html = `
        <div class="mb-6 border-b pb-4">
            <h3 class="text-2xl font-bold">${t('Xác nhận đặt phòng')}</h3>
            <p class="text-gray-500">${escapeHtml(type.ten_loai_phong)}</p>
        </div>

        <div class="grid grid-cols-2 gap-4 mb-6">
            <div class="bg-gray-50 p-4 rounded-lg">
                <p class="text-sm text-gray-500">${t('Nhận phòng')}</p>
                <p class="font-bold text-lg">${parseDate(ci)}</p>
            </div>
            <div class="bg-gray-50 p-4 rounded-lg">
                <p class="text-sm text-gray-500">${t('Trả phòng')}</p>
                <p class="font-bold text-lg">${parseDate(co)}</p>
            </div>
        </div>

        <div class="mb-6 flex justify-between items-center bg-indigo-50 p-4 rounded-lg border border-indigo-100">
            <span class="font-bold text-indigo-900">${t('Tổng tiền')} (${days} ${t('đêm')}):</span>
            <span class="text-2xl font-bold text-indigo-600">${formatMoney(total)}</span>
        </div>

        <form id="public-booking-form" onsubmit="submitPublicBooking(event)">
            <h4 class="font-bold mb-3">${t('Thông tin khách hàng')}</h4>

            ${!currentCustomer ? `
                <div class="bg-blue-50 p-3 rounded text-sm text-blue-800 mb-4 flex items-start gap-2">
                    <i class="fas fa-info-circle mt-1"></i>
                    <p>${t('Bạn đang đặt phòng với tư cách Khách.')} <a href="#" onclick="closeModal('booking'); showCustomerLogin()" class="font-bold underline">${t('Đăng nhập')}</a> ${t('để quản lý dễ dàng hơn.')}</p>
                </div>
            ` : ''}

            <div class="space-y-4">
                <div>
                    <label class="block text-sm font-medium mb-1">${t('Họ tên *')}</label>
                    <input type="text" id="b-name" class="w-full p-2 border rounded focus:ring-primary focus:border-primary outline-none" required value="${escapeHtml(currentCustomer?.ho_ten || '')}">
                </div>
                <div class="grid grid-cols-2 gap-4">
                    <div>
                        <label class="block text-sm font-medium mb-1">${t('Số điện thoại *')}</label>
                        <input type="tel" id="b-phone" class="w-full p-2 border rounded focus:ring-primary focus:border-primary outline-none" required value="${escapeHtml(currentCustomer?.sdt || '')}">
                    </div>
                    <div>
                        <label class="block text-sm font-medium mb-1">${t('Email')}</label>
                        <input type="email" id="b-email" class="w-full p-2 border rounded focus:ring-primary focus:border-primary outline-none" value="${escapeHtml(currentCustomer?.email || '')}">
                    </div>
                </div>
                <div>
                    <label class="block text-sm font-medium mb-1">${t('CMND/CCCD/Passport *')}</label>
                    <input type="text" id="b-id" class="w-full p-2 border rounded focus:ring-primary focus:border-primary outline-none" required value="${escapeHtml(currentCustomer?.cccd_passport || '')}">
                </div>
                <div>
                    <label class="block text-sm font-medium mb-1">${t('Mã khuyến mãi (nếu có)')}</label>
                    <div class="flex gap-2">
                        <input type="text" id="b-promo" class="w-full p-2 border rounded uppercase">
                        <button type="button" onclick="checkPromo()" class="bg-gray-200 px-4 rounded font-medium hover:bg-gray-300">${t('Áp dụng')}</button>
                    </div>
                    <p id="promo-msg" class="text-sm mt-1"></p>
                </div>

                <div class="border-t pt-4 mt-4">
                    <label class="block text-sm font-medium mb-2">${t('Thanh toán đặt cọc (50%)')}</label>
                    <div class="grid grid-cols-2 gap-3 mb-4">
                        <label class="border p-3 rounded-lg flex items-center gap-2 cursor-pointer hover:bg-gray-50 has-[:checked]:border-primary has-[:checked]:bg-indigo-50">
                            <input type="radio" name="payment" value="ChuyenKhoan" checked> ${t('Chuyển khoản')}
                        </label>
                        <label class="border p-3 rounded-lg flex items-center gap-2 cursor-pointer hover:bg-gray-50 has-[:checked]:border-primary has-[:checked]:bg-indigo-50">
                            <input type="radio" name="payment" value="The"> ${t('Thẻ tín dụng')}
                        </label>
                    </div>
                </div>
            </div>

            <div class="mt-8 flex gap-3 justify-end">
                <button type="button" class="px-5 py-2 text-gray-600 font-medium rounded hover:bg-gray-100" onclick="closeModal('booking')">${t('Hủy')}</button>
                <button type="submit" id="booking-submit-btn" class="bg-primary text-white px-6 py-2 rounded font-medium hover:bg-indigo-600 shadow-md">${t('Thanh toán & Đặt phòng')}</button>
            </div>
        </form>
    `;
    openModal('booking', html);
};

let appliedDiscount = 0;
let appliedPromoCode = null;
const checkPromo = async () => {
    const code = document.getElementById('b-promo').value.trim().toUpperCase();
    const msg = document.getElementById('promo-msg');
    const ctx = window.currentBookingContext;
    if (!code) {
        appliedDiscount = 0;
        appliedPromoCode = null;
        msg.innerHTML = '';
        return;
    }
    try {
        const res = await API.post('/bookings/validate-promo', { ma: code, so_tien: ctx ? ctx.total : undefined }, { auth: false });
        appliedDiscount = num(res.data.giam_gia);
        appliedPromoCode = res.data.ma;
        msg.innerHTML = `<span class="text-green-600"><i class="fas fa-check"></i> Đã giảm ${res.data.phan_tram}% (${formatMoney(appliedDiscount)})</span>`;
    } catch (err) {
        appliedDiscount = 0;
        appliedPromoCode = null;
        msg.innerHTML = `<span class="text-red-500"><i class="fas fa-times"></i> ${escapeHtml(err.message)}</span>`;
    }
};

const submitPublicBooking = async (e) => {
    e.preventDefault();

    const ctx = window.currentBookingContext;
    if (!ctx) { showToast('Vui lòng thử lại', 'warning'); return; }

    const ho_ten = document.getElementById('b-name').value.trim();
    const sdt = document.getElementById('b-phone').value.trim();
    const email = document.getElementById('b-email').value.trim();
    const cccd = document.getElementById('b-id').value.trim();
    const promoInput = document.getElementById('b-promo').value.trim().toUpperCase();
    const btn = document.getElementById('booking-submit-btn');
    btn.disabled = true;
    btn.textContent = 'Đang xử lý…';

    try {
        // Chọn 1 phòng trống thuộc loại đã chọn theo khoảng ngày (server kiểm tra overlap).
        let roomId = null;
        if (window.vacantByType && window.vacantByType[String(ctx.typeId)]
            && window.tempCheckIn === ctx.ci && window.tempCheckOut === ctx.co
            && window.vacantByType[String(ctx.typeId)].length) {
            roomId = window.vacantByType[String(ctx.typeId)][0];
        } else {
            const vacantRes = await API.get(`/rooms/vacant?check_in=${encodeURIComponent(ctx.ci)}&check_out=${encodeURIComponent(ctx.co)}`, { auth: false });
            const room = (vacantRes.data || []).find(r => String(r.loai_phong_id) === String(ctx.typeId));
            if (!room) {
                showToast('Rất tiếc, loại phòng này vừa hết. Vui lòng chọn loại khác.', 'error');
                closeModal('booking');
                return;
            }
            roomId = room.id;
        }

        const ma_km = promoInput || appliedPromoCode || undefined;
        const finalTotal = Math.max(0, ctx.total - appliedDiscount);
        const deposit = Math.round(finalTotal * 0.5); // cọc 50% theo khung đặt phòng

        let booking;
        if (currentCustomer) {
            const res = await API.post('/bookings', {
                khach_hang_id: currentCustomer.id,
                phong_id: roomId,
                ngay_check_in: ctx.ci,
                ngay_check_out: ctx.co,
                so_khach: 1,
                tien_coc: deposit,
                ...(ma_km ? { ma_km } : {}),
            });
            booking = res.data;
        } else {
            const res = await API.post('/bookings/guest', {
                ho_ten, sdt,
                ...(cccd ? { cccd_passport: cccd } : {}),
                ...(email ? { email } : {}),
                phong_id: roomId,
                ngay_check_in: ctx.ci,
                ngay_check_out: ctx.co,
                so_khach: 1,
                tien_coc: deposit,
                ...(ma_km ? { ma_km } : {}),
            }, { auth: false });
            booking = res.data;
        }

        closeModal('booking');
        appliedDiscount = 0;
        appliedPromoCode = null;
        showBookingSuccess(booking, deposit);
    } catch (err) {
        showToast(err.message, 'error');
        if (err.code === 'AUTH_UNAUTHORIZED') showCustomerLogin();
    } finally {
        btn.disabled = false;
        btn.textContent = 'Thanh toán & Đặt phòng';
    }
};

// Modal kết quả đặt phòng: mã đặt phòng thật + hướng dẫn thanh toán cọc (không ghi nhận thanh toán giả).
const showBookingSuccess = async (booking, deposit) => {
    const config = await getHotelConfig();
    const hasStripe = !!config.stripe_publishable_key;
    const html = `
        <div class="text-center mb-6">
            <div class="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <i class="fas fa-check-circle text-green-500 text-3xl"></i>
            </div>
            <h3 class="text-2xl font-bold">${t('Đặt phòng thành công!')}</h3>
            <p class="text-gray-500 mt-1">${t('Mã đặt phòng')}: <span class="font-mono font-bold text-indigo-600">#${booking.id}</span></p>
        </div>
        <div class="bg-indigo-50 border border-indigo-100 rounded-lg p-4 mb-6 text-sm text-indigo-900">
            <p class="font-bold mb-1"><i class="fas fa-info-circle mr-1"></i> ${t('Trạng thái: Chờ xác nhận')}</p>
            <p>${t('Đặt phòng của bạn đã được đồng bộ với lễ tân khách sạn.')} ${deposit > 0 ? `${t('Tiền cọc cần thanh toán')}: <b>${formatMoney(deposit)}</b>.` : ''} ${hasStripe && currentCustomer ? t('Bạn có thể thanh toán cọc online ngay bên dưới.') : t('Vui lòng thanh toán qua chuyển khoản hoặc tại quầy khi nhận phòng.')}</p>
        </div>
        <div class="flex flex-col gap-3">
            ${hasStripe && currentCustomer ? `<button onclick="closeModal('booking-success'); openOnlinePayment(${booking.id}, ${deposit})" class="w-full bg-gradient-to-r from-indigo-500 to-purple-600 text-white font-bold py-3 rounded-lg hover:shadow-lg transition"><i class="far fa-credit-card mr-2"></i> ${t('Thanh toán cọc online')}</button>` : ''}
            ${currentCustomer ? `<button onclick="closeModal('booking-success'); renderCustomerBookings()" class="w-full bg-gray-900 text-white font-bold py-3 rounded-lg hover:bg-indigo-600 transition">${t('Xem lịch sử đặt phòng')}</button>`
                : `<button onclick="closeModal('booking-success'); updateNav('lookup'); renderLookupPage()" class="w-full bg-gray-900 text-white font-bold py-3 rounded-lg hover:bg-indigo-600 transition">${t('Tra cứu đặt phòng')}</button>`}
            <button onclick="closeModal('booking-success')" class="w-full text-gray-500 font-medium py-2 hover:text-gray-800 transition">${t('Đóng')}</button>
        </div>
    `;
    openModal('booking-success', html);
    showToast('Đặt phòng thành công! Cảm ơn bạn.', 'success');
};

const showCustomerLogin = () => {
    const html = `
        <div class="text-center mb-6">
            <h2 class="text-2xl font-bold">${t('Đăng nhập / Đăng ký')}</h2>
            <p class="text-gray-500 text-sm mt-1">${t('Dành cho Khách Hàng')}</p>
        </div>

        <div class="space-y-4">
            <div>
                <label class="block text-sm font-medium mb-1">${t('Số điện thoại hoặc Email')}</label>
                <input type="text" id="c-login-user" class="w-full p-3 border rounded-lg focus:ring-2 focus:ring-primary outline-none">
            </div>
            <div>
                <label class="block text-sm font-medium mb-1">${t('Mật khẩu')}</label>
                <input type="password" id="c-login-pass" class="w-full p-3 border rounded-lg focus:ring-2 focus:ring-primary outline-none" onkeydown="if(event.key==='Enter') loginCustomer()">
            </div>
            <p id="c-login-msg" class="text-sm"></p>
            <button onclick="loginCustomer()" id="c-login-btn" class="w-full bg-gradient-to-r from-indigo-500 to-purple-600 text-white font-bold py-3 rounded-lg shadow-md hover:shadow-lg transition">${t('Đăng nhập')}</button>

            <div class="text-center mt-4 border-t pt-4">
                <p class="text-sm text-gray-500 mb-2">${t('Chưa có tài khoản?')}</p>
                <button onclick="closeModal('clogin'); showCustomerRegister()" class="text-primary font-medium hover:underline">${t('Tạo tài khoản mới')}</button>
            </div>

            <div class="text-center mt-2 border-t pt-4">
                <p class="text-sm text-gray-500 mb-2">${t('Bạn là nhân viên?')}</p>
                <button onclick="closeModal('clogin'); goAdmin()" class="text-gray-700 font-medium hover:text-primary transition"><i class="fas fa-lock mr-1"></i> ${t('Đăng nhập Admin Portal')}</button>
            </div>
        </div>
    `;
    openModal('clogin', html);
};

const loginCustomer = async () => {
    const user = document.getElementById('c-login-user').value.trim();
    const pass = document.getElementById('c-login-pass').value;
    const msg = document.getElementById('c-login-msg');
    const btn = document.getElementById('c-login-btn');
    if (!user || !pass) {
        msg.innerHTML = '<span class="text-red-500">Vui lòng nhập thông tin đăng nhập</span>';
        return;
    }
    btn.disabled = true;
    msg.innerHTML = '';
    try {
        const res = await API.post('/customers/login', { login: user, password: pass }, { auth: false });
        setCustomerToken(res.data.token);
        currentCustomer = res.data.customer;
        sessionStorage.setItem('HoangAn_CUSTOMER', JSON.stringify(currentCustomer));
        closeModal('clogin');
        showToast('Đăng nhập thành công', 'success');
        renderCustomerApp();
    } catch (err) {
        msg.innerHTML = `<span class="text-red-500">${escapeHtml(err.message)}</span>`;
        if (err.code === 'ACCOUNT_NOT_VERIFIED') {
            const resend = document.createElement('button');
            resend.className = 'mt-2 text-sm text-indigo-600 font-medium underline';
            resend.textContent = 'Gửi lại email xác thực';
            resend.onclick = async () => {
                try {
                    const r = await API.post('/customers/resend-verification', { email: user }, { auth: false });
                    msg.innerHTML = `<span class="text-green-600">${r.data?.verification_url_dev
                        ? 'SMTP chưa cấu hình (môi trường dev) — dùng link: '
                        : 'Đã gửi lại email xác thực (nếu email tồn tại).'}${r.data?.verification_url_dev ? `<a class="underline break-all" href="${escapeHtml(r.data.verification_url_dev)}">${escapeHtml(r.data.verification_url_dev)}</a>` : ''}</span>`;
                } catch (e2) {
                    msg.innerHTML = `<span class="text-red-500">${escapeHtml(e2.message)}</span>`;
                }
            };
            msg.appendChild(document.createElement('br'));
            msg.appendChild(resend);
        }
    } finally {
        btn.disabled = false;
    }
};

const toggleCustomerAccountMenu = (event) => {
    event.stopPropagation();
    const menu = document.getElementById('customerAccountMenu');
    const chevron = document.getElementById('customerAccountChevron');
    if (!menu) return;
    const isOpen = !menu.classList.contains('hidden');
    if (isOpen) {
        closeCustomerAccountMenu();
    } else {
        menu.classList.remove('hidden');
        if (chevron) chevron.style.transform = 'rotate(180deg)';
    }
};

const closeCustomerAccountMenu = () => {
    const menu = document.getElementById('customerAccountMenu');
    const chevron = document.getElementById('customerAccountChevron');
    if (menu) menu.classList.add('hidden');
    if (chevron) chevron.style.transform = '';
};

document.addEventListener('click', (event) => {
    const wrapper = document.getElementById('customerAccountWrapper');
    if (wrapper && !wrapper.contains(event.target)) {
        closeCustomerAccountMenu();
    }
});

const logoutCustomer = async () => {
    // Thu hồi token phía server trước khi xóa phiên cục bộ (nếu còn kết nối).
    try { await API.post('/auth/logout', {}); } catch { /* token hết hạn/offline — vẫn đăng xuất */ }
    clearCustomerSession();
    currentCustomer = null;
    showToast('Đã đăng xuất', 'info');
    renderCustomerApp();
};

const showCustomerRegister = () => {
    const html = `
        <div class="text-center mb-6">
            <h2 class="text-2xl font-bold">Tạo tài khoản mới</h2>
        </div>

        <div class="space-y-4">
            <div>
                <label class="block text-sm font-medium mb-1">Họ và tên *</label>
                <input type="text" id="reg-name" class="w-full p-2 border rounded focus:ring-primary outline-none">
            </div>
            <div class="grid grid-cols-2 gap-4">
                <div>
                    <label class="block text-sm font-medium mb-1">Số điện thoại *</label>
                    <input type="text" id="reg-phone" class="w-full p-2 border rounded focus:ring-primary outline-none">
                </div>
                <div>
                    <label class="block text-sm font-medium mb-1">Email *</label>
                    <input type="email" id="reg-email" class="w-full p-2 border rounded focus:ring-primary outline-none">
                </div>
            </div>
            <div>
                <label class="block text-sm font-medium mb-1">CMND/CCCD/Passport *</label>
                <input type="text" id="reg-id" class="w-full p-2 border rounded focus:ring-primary outline-none">
            </div>
            <div>
                <label class="block text-sm font-medium mb-1">Mật khẩu *</label>
                <input type="password" id="reg-pass" class="w-full p-2 border rounded focus:ring-primary outline-none">
                <p class="text-xs text-gray-400 mt-1">Tối thiểu 8 ký tự, có chữ cái in hoa và chữ số.</p>
            </div>
            <button onclick="registerCustomer()" id="reg-btn" class="w-full bg-primary text-white font-bold py-3 rounded shadow hover:bg-indigo-600 transition">Đăng ký</button>

            <div class="text-center mt-4">
                <button onclick="closeModal('cregister'); showCustomerLogin()" class="text-gray-500 text-sm hover:underline">Quay lại đăng nhập</button>
            </div>
        </div>
    `;
    openModal('cregister', html);
};

const registerCustomer = async () => {
    const name = document.getElementById('reg-name').value.trim();
    const phone = document.getElementById('reg-phone').value.trim();
    const email = document.getElementById('reg-email').value.trim();
    const cccd = document.getElementById('reg-id').value.trim();
    const pass = document.getElementById('reg-pass').value;
    const btn = document.getElementById('reg-btn');

    if (!name || !phone || !email || !cccd || !pass) return showToast('Vui lòng điền đủ thông tin bắt buộc', 'warning');

    btn.disabled = true;
    try {
        const res = await API.post('/customers/register', {
            ho_ten: name, sdt: phone, email, cccd_passport: cccd, password: pass,
        }, { auth: false });
        closeModal('cregister');
        const devLink = res.data?.verification_url_dev;
        const html = `
            <div class="text-center mb-6">
                <div class="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <i class="fas fa-envelope-open-text text-blue-500 text-3xl"></i>
                </div>
                <h3 class="text-2xl font-bold">Xác thực email của bạn</h3>
                <p class="text-gray-500 mt-2 text-sm">Chúng tôi đã gửi liên kết xác thực đến <b>${escapeHtml(email)}</b>.<br>Hãy mở liên kết để kích hoạt tài khoản trước khi đăng nhập.</p>
            </div>
            ${devLink ? `<div class="bg-yellow-50 border border-yellow-100 rounded-lg p-3 text-xs text-yellow-800 mb-4 break-all"><b>(Dev — SMTP chưa cấu hình)</b> Link xác thực: <a class="underline" href="${escapeHtml(devLink)}">${escapeHtml(devLink)}</a></div>` : ''}
            <button onclick="closeModal('cverify'); showCustomerLogin()" class="w-full bg-primary text-white font-bold py-3 rounded hover:bg-indigo-600 transition">Về đăng nhập</button>
        `;
        openModal('cverify', html);
    } catch (err) {
        showToast(err.message, 'error');
    } finally {
        btn.disabled = false;
    }
};

const canModifyBooking = (b) => ['ChoXacNhan', 'DaDat'].includes(b.trang_thai)
    && (new Date(b.ngay_check_in).getTime() - Date.now()) >= 24 * 60 * 60 * 1000;

const renderCustomerBookings = async () => {
    if (!currentCustomer) return showCustomerLogin();
    updateNav('');

    document.getElementById('customer-content').innerHTML = `
        <div class="max-w-5xl mx-auto px-4 py-12">
            <h2 class="text-3xl font-bold mb-8">${t('Lịch sử đặt phòng')}</h2>
            <div class="space-y-6" id="my-bookings-container">
                <div class="text-center text-gray-400 py-8"><i class="fas fa-spinner fa-spin text-2xl mr-2"></i> ${t('Đang tải…')}</div>
            </div>
        </div>
    `;

    const container = document.getElementById('my-bookings-container');
    let bookings;
    try {
        const res = await API.get('/customers/me/bookings');
        bookings = res.data || [];
    } catch (err) {
        if (err.statusCode === 401) return showCustomerLogin();
        container.innerHTML = `<p class="text-gray-500 bg-gray-50 p-8 rounded-xl text-center">${escapeHtml(err.message)}</p>`;
        return;
    }

    if (!bookings.length) {
        container.innerHTML = `<p class="text-gray-500 bg-gray-50 p-8 rounded-xl text-center">${t('Bạn chưa có đặt phòng nào.')}</p>`;
        return;
    }

    container.innerHTML = bookings.map(b => {
        const due = b.invoice ? Math.max(0, num(b.invoice.tong_cong) - num(b.tong_da_thanh_toan)) : 0;
        const showPay = b.invoice && b.invoice.trang_thai_thanh_toan !== 'DaThanhToan'
            && !['Huy', 'NoShow', 'DaTra'].includes(b.trang_thai) && due > 0;
        const showReview = b.trang_thai === 'DaTra' && !b.reviewed;
        return `
        <div class="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 flex flex-col md:flex-row justify-between items-center gap-6">
            <div>
                <div class="flex items-center gap-3 mb-2">
                    <span class="font-mono text-gray-500 text-sm">#${b.id}</span>
                    ${bookingStatusBadge(b.trang_thai)}
                </div>
                <h3 class="text-xl font-bold text-gray-800">${escapeHtml(b.ten_loai_phong || 'Phòng')} - ${escapeHtml(b.so_phong || '')}</h3>
                <p class="text-gray-600 mt-1"><i class="far fa-calendar-alt w-5"></i> ${parseDate(b.ngay_check_in)} <i class="fas fa-arrow-right mx-2 text-gray-400"></i> ${parseDate(b.ngay_check_out)}</p>
                ${b.invoice ? `<p class="text-sm text-gray-500 mt-1"><i class="fas fa-receipt w-5"></i> Hóa đơn #${b.invoice.id}: ${formatMoney(num(b.invoice.tong_cong))}${num(b.tong_da_thanh_toan) > 0 ? ` · Đã thanh toán ${formatMoney(num(b.tong_da_thanh_toan))}` : ''}</p>` : ''}
            </div>
            <div class="text-right">
                <p class="text-sm text-gray-500">${t('Tổng cộng')}</p>
                <p class="text-2xl font-bold text-indigo-600">${b.invoice ? formatMoney(num(b.invoice.tong_cong)) : t('Chưa lập')}</p>

                <div class="mt-4 flex gap-2 justify-end flex-wrap">
                    ${showPay ? `<button onclick="openOnlinePayment(${b.id}, ${due}, () => renderCustomerBookings())" class="text-sm bg-indigo-50 text-indigo-600 px-4 py-2 rounded font-medium hover:bg-indigo-100">${t('Thanh toán online')}</button>` : ''}
                    ${showReview ? `<button onclick="showReviewForm(${b.id})" class="text-sm bg-yellow-50 text-yellow-600 px-4 py-2 rounded font-medium hover:bg-yellow-100">${t('Đánh giá')}</button>` : ''}
                    ${canModifyBooking(b) ? `<button onclick="openEditBookingModal(${b.id})" class="text-sm bg-gray-50 text-gray-700 px-4 py-2 rounded font-medium hover:bg-gray-100">${t('Sửa')}</button>` : ''}
                    ${canModifyBooking(b) ? `<button onclick="cancelBooking(${b.id})" class="text-sm text-red-500 px-4 py-2 hover:bg-red-50 rounded font-medium transition">${t('Hủy phòng')}</button>` : ''}
                </div>
            </div>
        </div>
    `; }).join('');
};

const cancelBooking = async (id) => {
    if (confirm('Bạn có chắc chắn muốn hủy đặt phòng này? (Tiền cọc sẽ được hoàn lại theo chính sách)')) {
        try {
            await API.post(`/customers/me/bookings/${id}/cancel`, {});
            showToast('Hủy phòng thành công', 'success');
            renderCustomerBookings();
        } catch (err) {
            showToast(err.message, 'error');
        }
    }
};

// Sửa đặt phòng (US-43): chỉ đổi ngày — server chặn sửa sau mốc 24h trước nhận phòng.
const openEditBookingModal = (id) => {
    let booking = null;
    API.get('/customers/me/bookings').then(res => {
        booking = (res.data || []).find(b => Number(b.id) === Number(id));
        if (!booking) return showToast('Không tìm thấy đặt phòng', 'error');
        const html = `
            <div class="mb-4 border-b pb-3">
                <h3 class="text-xl font-bold">Sửa đặt phòng #${booking.id}</h3>
                <p class="text-gray-500 text-sm">Chỉ có thể sửa trước giờ nhận phòng ít nhất 24 giờ.</p>
            </div>
            <form id="edit-booking-form" onsubmit="submitEditBooking(event, ${booking.id})" class="space-y-4">
                <div class="grid grid-cols-2 gap-4">
                    <div>
                        <label class="block text-sm font-medium mb-1">Nhận phòng</label>
                        <input type="date" id="eb-checkin" class="w-full p-2 border rounded focus:ring-primary outline-none" required value="${escapeHtml(String(booking.ngay_check_in).slice(0, 10))}">
                    </div>
                    <div>
                        <label class="block text-sm font-medium mb-1">Trả phòng</label>
                        <input type="date" id="eb-checkout" class="w-full p-2 border rounded focus:ring-primary outline-none" required value="${escapeHtml(String(booking.ngay_check_out).slice(0, 10))}">
                    </div>
                </div>
                <p id="eb-msg" class="text-sm"></p>
                <div class="flex gap-3 justify-end">
                    <button type="button" class="px-5 py-2 text-gray-600 font-medium rounded hover:bg-gray-100" onclick="closeModal('ebooking')">Hủy</button>
                    <button type="submit" class="bg-primary text-white px-6 py-2 rounded font-medium hover:bg-indigo-600">Lưu thay đổi</button>
                </div>
            </form>
        `;
        openModal('ebooking', html);
    }).catch(err => showToast(err.message, 'error'));
};

const submitEditBooking = async (e, id) => {
    e.preventDefault();
    const ci = document.getElementById('eb-checkin').value;
    const co = document.getElementById('eb-checkout').value;
    const msg = document.getElementById('eb-msg');
    if (!ci || !co || co <= ci) {
        msg.innerHTML = '<span class="text-red-500">Ngày trả phòng phải sau ngày nhận phòng</span>';
        return;
    }
    try {
        await API.put(`/customers/me/bookings/${id}`, { ngay_check_in: ci, ngay_check_out: co });
        closeModal('ebooking');
        showToast('Cập nhật đặt phòng thành công', 'success');
        renderCustomerBookings();
    } catch (err) {
        msg.innerHTML = `<span class="text-red-500">${escapeHtml(err.message)}</span>`;
    }
};

// Đánh giá sau lưu trú (US-45): chỉ đơn DaTra mới hiện nút; server chặn 1 đánh giá/đơn.
const showReviewForm = (bookingId) => {
    let picked = 5;
    const html = `
        <div class="mb-4 border-b pb-3">
            <h3 class="text-xl font-bold">Đánh giá kỳ nghỉ #${bookingId}</h3>
            <p class="text-gray-500 text-sm">Đánh giá sẽ hiển thị công khai sau khi được khách sạn duyệt.</p>
        </div>
        <div class="text-center mb-4">
            <div id="review-stars" class="text-3xl text-yellow-400 flex justify-center gap-2 cursor-pointer"></div>
        </div>
        <textarea id="review-content" rows="4" placeholder="Chia sẻ trải nghiệm của bạn…" class="w-full p-3 border rounded-lg focus:ring-2 focus:ring-primary outline-none"></textarea>
        <p id="review-msg" class="text-sm mt-1"></p>
        <div class="flex gap-3 justify-end mt-4">
            <button type="button" class="px-5 py-2 text-gray-600 font-medium rounded hover:bg-gray-100" onclick="closeModal('review')">Hủy</button>
            <button type="button" id="review-submit" class="bg-primary text-white px-6 py-2 rounded font-medium hover:bg-indigo-600">Gửi đánh giá</button>
        </div>
    `;
    openModal('review', html);

    const starsEl = document.getElementById('review-stars');
    const renderStars = () => {
        starsEl.innerHTML = [1, 2, 3, 4, 5].map(i =>
            `<span data-star="${i}" class="${i <= picked ? 'fas fa-star' : 'far fa-star text-gray-300'}"></span>`).join('');
        starsEl.querySelectorAll('[data-star]').forEach(s => {
            s.addEventListener('click', () => { picked = Number(s.dataset.star); renderStars(); });
        });
    };
    renderStars();

    document.getElementById('review-submit').addEventListener('click', async () => {
        const btn = document.getElementById('review-submit');
        const msg = document.getElementById('review-msg');
        btn.disabled = true;
        try {
            await API.post('/reviews', {
                dat_phong_id: bookingId,
                so_sao: picked,
                noi_dung: document.getElementById('review-content').value.trim() || undefined,
            });
            closeModal('review');
            showToast('Cảm ơn bạn đã đánh giá! Đánh giá sẽ hiển thị sau khi được duyệt.', 'success');
            renderCustomerBookings();
        } catch (err) {
            msg.innerHTML = `<span class="text-red-500">${escapeHtml(err.message)}</span>`;
            btn.disabled = false;
        }
    });
};

// Thanh toán online (US-40): Stripe Elements khi cổng đã cấu hình; khách chưa đăng nhập thanh toán tại quầy.
const openOnlinePayment = async (bookingId, amount, onDone) => {
    const config = await getHotelConfig();
    if (!config.stripe_publishable_key) {
        showToast('Cổng thanh toán online chưa được cấu hình. Vui lòng thanh toán tại quầy hoặc chuyển khoản.', 'warning');
        return;
    }
    if (!currentCustomer) return showCustomerLogin();

    const html = `
        <div class="mb-4 border-b pb-3">
            <h3 class="text-xl font-bold">Thanh toán online — Đặt phòng #${bookingId}</h3>
            <p class="text-gray-500 text-sm">Số tiền cần thanh toán: <b class="text-indigo-600">${formatMoney(amount)}</b></p>
        </div>
        <div id="stripe-card-element" class="p-3 border rounded-lg mb-3 min-h-[44px]"></div>
        <p id="pay-msg" class="text-sm mb-3"></p>
        <div class="flex gap-3 justify-end">
            <button type="button" class="px-5 py-2 text-gray-600 font-medium rounded hover:bg-gray-100" onclick="closeModal('pay')">Đóng</button>
            <button type="button" id="pay-submit" class="bg-gradient-to-r from-indigo-500 to-purple-600 text-white px-6 py-2 rounded font-bold hover:shadow-lg">Thanh toán</button>
        </div>
    `;
    openModal('pay', html);

    const status = document.getElementById('pay-msg');
    const payBtn = document.getElementById('pay-submit');
    try {
        const { loadStripe } = await import('https://js.stripe.com/v3/bundle/stripe.mjs');
        const stripe = await loadStripe(config.stripe_publishable_key);
        const elements = stripe.elements();
        const card = elements.create('card');
        card.mount('#stripe-card-element');

        payBtn.addEventListener('click', async () => {
            payBtn.disabled = true;
            try {
                const res = await API.post('/payments/online', { booking_id: Number(bookingId), amount: Number(amount) });
                const result = await stripe.confirmCardPayment(res.data.client_secret, {
                    payment_method: { card, billing_details: {} },
                });
                if (result.error) {
                    status.innerHTML = `<span class="text-red-500">${escapeHtml(result.error.message)}</span>`;
                    payBtn.disabled = false;
                    return;
                }
                status.innerHTML = '<span class="text-green-600">Thanh toán thành công! Cảm ơn quý khách.</span>';
                showToast('Thanh toán thành công', 'success');
                setTimeout(() => { closeModal('pay'); onDone && onDone(); }, 1200);
            } catch (err) {
                status.innerHTML = `<span class="text-red-500">${escapeHtml(err.message)}</span>`;
                payBtn.disabled = false;
            }
        });
    } catch (err) {
        status.innerHTML = `<span class="text-red-500">Không tải được cổng thanh toán: ${escapeHtml(err.message)}</span>`;
        payBtn.disabled = true;
    }
};

const renderCustomerProfile = async () => {
    if (!currentCustomer) return showCustomerLogin();
    updateNav('');

    document.getElementById('customer-content').innerHTML = `
        <div class="max-w-2xl mx-auto px-4 py-12">
            <div class="bg-white rounded-2xl shadow-sm border border-gray-100 p-8">
                <div class="flex items-center gap-4 mb-8 pb-6 border-b">
                    <div class="w-16 h-16 bg-gradient-to-r from-indigo-500 to-purple-600 rounded-full flex items-center justify-center text-white text-2xl font-bold">
                        ${escapeHtml((currentCustomer.ho_ten || 'K').charAt(0))}
                    </div>
                    <div>
                        <h2 class="text-2xl font-bold">${escapeHtml(currentCustomer.ho_ten)}</h2>
                        <p class="text-gray-500">Thành viên HoangAn</p>
                    </div>
                </div>

                <form onsubmit="updateProfile(event)" class="space-y-4">
                    <div>
                        <label class="block text-sm font-medium mb-1 text-gray-700">Họ và tên</label>
                        <input type="text" id="prof-name" class="w-full p-3 border rounded-lg focus:ring-2 focus:ring-primary outline-none" value="${escapeHtml(currentCustomer.ho_ten || '')}">
                    </div>
                    <div class="grid grid-cols-2 gap-4">
                        <div>
                            <label class="block text-sm font-medium mb-1 text-gray-700">Số điện thoại</label>
                            <input type="text" id="prof-phone" class="w-full p-3 border rounded-lg bg-gray-50 outline-none" value="${escapeHtml(currentCustomer.sdt || '')}" disabled>
                        </div>
                        <div>
                            <label class="block text-sm font-medium mb-1 text-gray-700">Email</label>
                            <input type="email" id="prof-email" class="w-full p-3 border rounded-lg focus:ring-2 focus:ring-primary outline-none" value="${escapeHtml(currentCustomer.email || '')}">
                        </div>
                    </div>

                    <div class="pt-6 mt-6 border-t">
                        <h3 class="font-bold mb-4">Đổi mật khẩu</h3>
                        <div class="space-y-4">
                            <input type="password" id="prof-old-pass" placeholder="Mật khẩu hiện tại" class="w-full p-3 border rounded-lg focus:ring-2 focus:ring-primary outline-none">
                            <input type="password" id="prof-new-pass" placeholder="Mật khẩu mới (tối thiểu 8 ký tự, có chữ in hoa và chữ số)" class="w-full p-3 border rounded-lg focus:ring-2 focus:ring-primary outline-none">
                        </div>
                    </div>

                    <div class="pt-6 flex justify-end">
                        <button type="submit" class="bg-primary text-white px-8 py-3 rounded-lg font-bold hover:bg-indigo-600 transition shadow-md">Cập nhật hồ sơ</button>
                    </div>
                </form>
            </div>
        </div>
    `;
};

const updateProfile = async (e) => {
    e.preventDefault();
    const name = document.getElementById('prof-name').value.trim();
    const email = document.getElementById('prof-email').value.trim();
    const oldPass = document.getElementById('prof-old-pass').value;
    const newPass = document.getElementById('prof-new-pass').value;

    try {
        await API.put('/customers/me', { ho_ten: name, email });
        if (newPass) {
            if (newPass.length < 8 || !/[A-Z]/.test(newPass) || !/[0-9]/.test(newPass)) {
                return showToast('Mật khẩu mới phải tối thiểu 8 ký tự, có chữ in hoa và chữ số', 'warning');
            }
            if (!oldPass) return showToast('Vui lòng nhập mật khẩu hiện tại để đổi mật khẩu', 'warning');
            await API.put('/customers/me/password', { currentPassword: oldPass, newPassword: newPass });
        }
        // Làm mới thông tin mới nhất từ server
        const res = await API.get('/customers/me');
        currentCustomer = res.data;
        sessionStorage.setItem('HoangAn_CUSTOMER', JSON.stringify(currentCustomer));

        showToast('Cập nhật hồ sơ thành công', 'success');
        document.getElementById('prof-old-pass').value = '';
        document.getElementById('prof-new-pass').value = '';
        renderCustomerApp(); // refresh navbar name
    } catch (err) {
        showToast(err.message, 'error');
    }
};

const renderReviews = async () => {
    updateNav('');

    document.getElementById('customer-content').innerHTML = `
        <div class="max-w-5xl mx-auto px-4 py-16">
            <div class="text-center mb-12">
                <h2 class="text-3xl md:text-4xl font-bold text-gray-800 mb-4">Đánh Giá Từ Khách Hàng</h2>
                <div class="w-24 h-1 bg-gradient-to-r from-indigo-500 to-purple-600 mx-auto rounded-full"></div>
            </div>

            <div class="grid grid-cols-1 md:grid-cols-2 gap-8" id="reviews-container">
                <div class="col-span-2 text-center text-gray-400 py-8"><i class="fas fa-spinner fa-spin text-2xl mr-2"></i> Đang tải…</div>
            </div>
        </div>
    `;

    const container = document.getElementById('reviews-container');
    try {
        const res = await API.get('/reviews/public', { auth: false });
        const reviews = res.data || [];
        container.innerHTML = reviews.length === 0
            ? '<p class="col-span-2 text-center text-gray-500 py-8">Chưa có đánh giá nào.</p>'
            : reviews.map(r => `
                <div class="bg-white p-8 rounded-2xl shadow-sm border border-gray-100 relative">
                    <i class="fas fa-quote-right absolute top-6 right-8 text-4xl text-gray-100"></i>
                    <div class="flex text-yellow-400 mb-4">
                        ${Array(Math.max(1, Math.min(5, Number(r.so_sao) || 5))).fill('<i class="fas fa-star"></i>').join('')}
                        ${Array(5 - Math.max(1, Math.min(5, Number(r.so_sao) || 5))).fill('<i class="far fa-star text-gray-300"></i>').join('')}
                    </div>
                    <p class="text-gray-600 mb-6 italic">"${escapeHtml(r.noi_dung || '')}"</p>
                    <div class="flex items-center gap-3">
                        <div class="w-10 h-10 bg-indigo-100 rounded-full flex items-center justify-center text-indigo-800 font-bold">
                            ${escapeHtml((r.ten_khach || 'U').charAt(0))}
                        </div>
                        <div>
                            <p class="font-bold text-sm text-gray-800">${escapeHtml(r.ten_khach || 'Khách hàng')}</p>
                            <p class="text-xs text-gray-500">Khách đã lưu trú</p>
                        </div>
                    </div>
                </div>
            `).join('');
    } catch (err) {
        container.innerHTML = `<p class="col-span-2 text-center text-gray-500 py-8">${escapeHtml(err.message)}</p>`;
    }
};

// Tra cứu đặt phòng không cần tài khoản (US-48): mã đặt phòng + SĐT/email.
const renderLookupPage = () => {
    document.getElementById('customer-content').innerHTML = `
        <div class="max-w-2xl mx-auto px-4 py-12">
            <div class="text-center mb-10">
                <h2 class="text-3xl md:text-4xl font-bold text-gray-800 mb-4">Tra Cứu Đặt Phòng</h2>
                <div class="w-24 h-1 bg-gradient-to-r from-indigo-500 to-purple-600 mx-auto rounded-full"></div>
                <p class="text-gray-500 mt-4">Nhập mã đặt phòng và số điện thoại/email đã dùng khi đặt.</p>
            </div>
            <div class="bg-white rounded-2xl shadow-md border border-gray-100 p-8">
                <form onsubmit="lookupBooking(event)" class="space-y-4">
                    <div>
                        <label class="block text-sm font-medium mb-1 text-gray-700">Mã đặt phòng *</label>
                        <input type="number" min="1" id="lk-code" class="w-full p-3 border rounded-lg focus:ring-2 focus:ring-primary outline-none" required placeholder="VD: 12">
                    </div>
                    <div>
                        <label class="block text-sm font-medium mb-1 text-gray-700">Số điện thoại hoặc Email *</label>
                        <input type="text" id="lk-contact" class="w-full p-3 border rounded-lg focus:ring-2 focus:ring-primary outline-none" required>
                    </div>
                    <button type="submit" class="w-full bg-gradient-to-r from-indigo-500 to-purple-600 text-white font-bold py-3 rounded-lg hover:shadow-lg transition"><i class="fas fa-search mr-2"></i>Tra cứu</button>
                </form>
                <div id="lk-result" class="mt-6"></div>
            </div>
        </div>
    `;
};

const lookupBooking = async (e) => {
    e.preventDefault();
    const code = document.getElementById('lk-code').value;
    const contact = document.getElementById('lk-contact').value.trim();
    const result = document.getElementById('lk-result');
    result.innerHTML = '<div class="text-center text-gray-400 py-4"><i class="fas fa-spinner fa-spin text-xl mr-2"></i> Đang tra cứu…</div>';
    try {
        const res = await API.post('/bookings/guest/lookup', { booking_code: code, sdt_or_email: contact }, { auth: false });
        const b = res.data;
        result.innerHTML = `
            <div class="bg-gray-50 rounded-xl p-6 border border-gray-100">
                <div class="flex items-center gap-3 mb-3">
                    <span class="font-mono text-gray-500">#${b.id}</span>
                    ${bookingStatusBadge(b.trang_thai)}
                </div>
                <h3 class="text-xl font-bold text-gray-800 mb-1">${escapeHtml(b.ten_loai_phong)} - Phòng ${escapeHtml(b.so_phong)}</h3>
                <p class="text-gray-600"><i class="far fa-calendar-alt w-5"></i> ${parseDate(b.ngay_check_in)} <i class="fas fa-arrow-right mx-2 text-gray-400"></i> ${parseDate(b.ngay_check_out)}</p>
                <p class="text-gray-600 mt-1"><i class="fas fa-user w-5"></i> ${escapeHtml(b.ho_ten)}</p>
                ${b.invoice ? `<p class="text-gray-800 mt-2 font-medium"><i class="fas fa-receipt w-5"></i> Hóa đơn #${b.invoice.id}: ${formatMoney(num(b.invoice.tong_cong))} (${escapeHtml(b.invoice.trang_thai_thanh_toan)})</p>` : '<p class="text-gray-500 mt-2">Chưa có hóa đơn.</p>'}
                ${num(b.tien_coc) > 0 ? `<p class="text-gray-600 mt-1 text-sm"><i class="fas fa-coins w-5"></i> Tiền cọc: ${formatMoney(num(b.tien_coc))}</p>` : ''}
            </div>
        `;
    } catch (err) {
        result.innerHTML = `<div class="bg-red-50 text-red-600 rounded-xl p-4 text-center">${escapeHtml(err.code === 'NOT_FOUND' ? 'Không tìm thấy đặt phòng. Kiểm tra lại mã và thông tin liên hệ.' : err.message)}</div>`;
    }
};

// Xác thực tài khoản qua link email: /#/verify-account?token=...
const renderVerifyView = async (token) => {
    await renderCustomerApp();
    const content = document.getElementById('customer-content');
    content.innerHTML = `
        <div class="max-w-md mx-auto px-4 py-20 text-center">
            <div id="verify-box" class="bg-white rounded-2xl shadow-md border border-gray-100 p-10">
                <i class="fas fa-spinner fa-spin text-3xl text-indigo-500 mb-4"></i>
                <p class="text-gray-500">Đang xác thực tài khoản…</p>
            </div>
        </div>
    `;
    const box = document.getElementById('verify-box');
    try {
        await API.post('/customers/verify-account', { token }, { auth: false });
        box.innerHTML = `
            <div class="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <i class="fas fa-check-circle text-green-500 text-3xl"></i>
            </div>
            <h2 class="text-2xl font-bold mb-2">Xác thực thành công!</h2>
            <p class="text-gray-500 mb-6">Tài khoản của bạn đã được kích hoạt. Hãy đăng nhập để đặt phòng.</p>
            <button onclick="showCustomerLogin()" class="bg-primary text-white font-bold px-8 py-3 rounded-lg hover:bg-indigo-600 transition">Đăng nhập</button>
        `;
    } catch (err) {
        box.innerHTML = `
            <div class="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <i class="fas fa-times-circle text-red-500 text-3xl"></i>
            </div>
            <h2 class="text-2xl font-bold mb-2">Xác thực không thành công</h2>
            <p class="text-gray-500 mb-6">${escapeHtml(err.message)}</p>
            <button onclick="showCustomerLogin()" class="bg-gray-900 text-white font-bold px-8 py-3 rounded-lg hover:bg-indigo-600 transition">Về đăng nhập</button>
        `;
    }
};
