// Application Logic for VHM SUB 2 Tracker
// Mendukung pembukaan langsung via file:// maupun http://

class RunningTrackerApp {
  constructor() {
    this.storageKey = 'vhm_sub2_training_data_v1';
    this.eventStorageKey = 'vhm_race_event_data_v1';
    this.initialData = (typeof window !== 'undefined' && window.INITIAL_TRAINING_DATA) ? window.INITIAL_TRAINING_DATA : [];
    this.sub2Config = (typeof window !== 'undefined' && window.SUB_2_CONFIG) ? window.SUB_2_CONFIG : {};
    this.defaultEvent = (typeof window !== 'undefined' && window.DEFAULT_RACE_EVENT) ? window.DEFAULT_RACE_EVENT : {
      eventName: "VHM — Half Marathon Sub 2",
      raceDate: "2026-12-13T05:30:00",
      distanceKm: 21.0975,
      targetTime: "01:59:59",
      targetPace: "5'41\"",
      location: "Road Race Course",
      bibNumber: "SUB-200"
    };

    this.weeksData = this.loadData();
    this.raceEvent = this.loadEvent();

    this.currentView = 'cards'; // 'cards' or 'excel'
    this.currentFilter = 'all'; // 'all', 'easy_run', 'tempo_run', 'interval_run', 'long_run'
    this.selectedWeekTab = 'all'; // 'all' or specific weekId
    this.collapsedWeeks = {}; // { [weekId]: boolean }
    
    // Calendar state (default November 2026 based on latest training log)
    this.calDate = new Date(2026, 10, 1); // 10 is November in JS (0-indexed)

    this.charts = {};
    this.editingSession = null; // null or { weekId, sessionId }
    this.countdownTimer = null;

    this.init();
  }

  loadData() {
    try {
      const saved = localStorage.getItem(this.storageKey);
      if (saved) {
        return JSON.parse(saved);
      }
    } catch (e) {
      console.warn('Gagal memuat data dari localStorage, menggunakan data default.', e);
    }
    return JSON.parse(JSON.stringify(this.initialData));
  }

  saveData() {
    try {
      localStorage.setItem(this.storageKey, JSON.stringify(this.weeksData));
      this.showToast('Data latihan tersimpan!');
    } catch (e) {
      console.error('Gagal menyimpan data ke localStorage', e);
      this.showToast('Gagal menyimpan data!', 'error');
    }
  }

  loadEvent() {
    try {
      const saved = localStorage.getItem(this.eventStorageKey);
      if (saved) {
        return JSON.parse(saved);
      }
    } catch (e) {
      console.warn('Gagal memuat event dari localStorage', e);
    }
    return JSON.parse(JSON.stringify(this.defaultEvent));
  }

  saveEventData() {
    try {
      localStorage.setItem(this.eventStorageKey, JSON.stringify(this.raceEvent));
      this.showToast('Event lomba diperbarui!');
    } catch (e) {
      console.error('Gagal menyimpan event data', e);
    }
  }

  init() {
    this.initCollapsedWeeks();
    this.initCountdown();
    this.renderSummaryStats();
    this.renderCalendar();
    this.renderTrainingContent();
    this.initCharts();
    this.bindEvents();
    this.updateWeekSelectorInModal();
  }

  // Week-week lama yang tidak berjalan otomatis di-minimize saat buka website
  initCollapsedWeeks() {
    this.collapsedWeeks = {};
    if (this.weeksData && this.weeksData.length > 0) {
      const lastIdx = this.weeksData.length - 1;
      this.weeksData.forEach((w, idx) => {
        this.collapsedWeeks[w.id] = (idx < lastIdx);
      });
    }
  }

  // Live Countdown Timer
  initCountdown() {
    this.updateEventUI();
    if (this.countdownTimer) clearInterval(this.countdownTimer);

    const tick = () => {
      const targetTime = new Date(this.raceEvent.raceDate).getTime();
      const now = new Date().getTime();
      const diff = targetTime - now;

      if (diff <= 0) {
        document.getElementById('countdown-days').textContent = '00';
        document.getElementById('countdown-hours').textContent = '00';
        document.getElementById('countdown-minutes').textContent = '00';
        document.getElementById('countdown-seconds').textContent = '00';
        return;
      }

      const days = Math.floor(diff / (1000 * 60 * 60 * 24));
      const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((diff % (1000 * 60)) / 1000);

      document.getElementById('countdown-days').textContent = days.toString().padStart(2, '0');
      document.getElementById('countdown-hours').textContent = hours.toString().padStart(2, '0');
      document.getElementById('countdown-minutes').textContent = minutes.toString().padStart(2, '0');
      document.getElementById('countdown-seconds').textContent = seconds.toString().padStart(2, '0');
    };

    tick();
    this.countdownTimer = setInterval(tick, 1000);
  }

  updateEventUI() {
    const elName = document.getElementById('countdown-event-name');
    if (elName) elName.textContent = this.raceEvent.eventName;

    const elDate = document.getElementById('countdown-event-date');
    if (elDate) {
      const d = new Date(this.raceEvent.raceDate);
      const dayNames = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
      const monthNames = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
      const formatted = `${dayNames[d.getDay()]}, ${d.getDate()} ${monthNames[d.getMonth()]} ${d.getFullYear()} • ${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')} WIB`;
      elDate.textContent = formatted;
    }

    const elTarget = document.getElementById('countdown-event-target');
    if (elTarget) elTarget.textContent = `< ${this.raceEvent.targetTime} (${this.raceEvent.targetPace}/km)`;

    const elLoc = document.getElementById('countdown-event-location');
    if (elLoc) elLoc.innerHTML = `<i data-lucide="map-pin" class="w-3.5 h-3.5"></i> ${this.raceEvent.location || 'Road Race'} ${this.raceEvent.bibNumber ? '• BIB: ' + this.raceEvent.bibNumber : ''}`;

    // Update Hero Logo
    const heroLogoImg = document.getElementById('hero-event-logo-img');
    const heroLogoIcon = document.getElementById('hero-event-logo-icon');
    if (heroLogoImg && heroLogoIcon) {
      if (this.raceEvent.logo) {
        heroLogoImg.src = this.raceEvent.logo;
        heroLogoImg.classList.remove('hidden');
        heroLogoIcon.classList.add('hidden');
      } else {
        heroLogoImg.src = '';
        heroLogoImg.classList.add('hidden');
        heroLogoIcon.classList.remove('hidden');
      }
    }

    if (window.lucide) window.lucide.createIcons();
  }

  // Handle Logo Upload and Compression
  async handleLogoUpload(event) {
    const file = event.target.files[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      this.showToast('Harap pilih file gambar (PNG, JPG, WebP)!', 'error');
      return;
    }

    try {
      this.tempLogoBase64 = await this.resizeAndCompressImage(file, 300, 300);
      this.updateModalLogoPreview();
      this.showToast('Foto logo berhasil dipilih!');
    } catch (err) {
      console.error('Gagal memproses gambar logo:', err);
      this.showToast('Gagal memproses gambar logo!', 'error');
    }
  }

  resizeAndCompressImage(file, maxWidth = 300, maxHeight = 300) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onerror = reject;
      reader.onload = (e) => {
        const img = new Image();
        img.onerror = reject;
        img.onload = () => {
          const canvas = document.createElement('canvas');
          let width = img.width;
          let height = img.height;

          if (width > height) {
            if (width > maxWidth) {
              height = Math.round((height * maxWidth) / width);
              width = maxWidth;
            }
          } else {
            if (height > maxHeight) {
              width = Math.round((width * maxHeight) / height);
              height = maxHeight;
            }
          }

          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          ctx.drawImage(img, 0, 0, width, height);

          // Convert to WebP or JPEG for compact size
          resolve(canvas.toDataURL('image/webp', 0.85));
        };
        img.src = e.target.result;
      };
      reader.readAsDataURL(file);
    });
  }

  removeEventLogo() {
    this.tempLogoBase64 = null;
    const fileInput = document.getElementById('event-input-logo');
    if (fileInput) fileInput.value = '';
    this.updateModalLogoPreview();
  }

  updateModalLogoPreview() {
    const previewImg = document.getElementById('event-logo-preview');
    const placeholder = document.getElementById('event-logo-placeholder');
    const btnRemove = document.getElementById('btn-remove-logo');

    if (previewImg && placeholder && btnRemove) {
      if (this.tempLogoBase64) {
        previewImg.src = this.tempLogoBase64;
        previewImg.classList.remove('hidden');
        placeholder.classList.add('hidden');
        btnRemove.classList.remove('hidden');
      } else {
        previewImg.src = '';
        previewImg.classList.add('hidden');
        placeholder.classList.remove('hidden');
        btnRemove.classList.add('hidden');
      }
    }
  }

  // Open & Close Event Modal
  openEventModal() {
    document.getElementById('event-input-name').value = this.raceEvent.eventName || '';
    document.getElementById('event-input-date').value = this.raceEvent.raceDate ? this.raceEvent.raceDate.substring(0, 16) : '';
    document.getElementById('event-input-distance').value = this.raceEvent.distanceKm || 21.0975;
    document.getElementById('event-input-time').value = this.raceEvent.targetTime || '01:59:59';
    document.getElementById('event-input-pace').value = this.raceEvent.targetPace || "5'41\"";
    document.getElementById('event-input-location').value = this.raceEvent.location || '';
    document.getElementById('event-input-bib').value = this.raceEvent.bibNumber || '';
    document.getElementById('event-input-notes').value = this.raceEvent.notes || '';

    // Set temp logo from current event logo
    this.tempLogoBase64 = this.raceEvent.logo || null;
    this.updateModalLogoPreview();

    document.getElementById('modal-event').classList.remove('hidden');
  }

  closeEventModal() {
    document.getElementById('modal-event').classList.add('hidden');
  }

  handleSaveEvent(e) {
    if (e && e.preventDefault) e.preventDefault();
    if (e && e.stopPropagation) e.stopPropagation();

    const nameInput = document.getElementById('event-input-name');
    const dateInput = document.getElementById('event-input-date');
    if (!nameInput || !dateInput) return false;

    this.raceEvent = {
      eventName: nameInput.value.trim() || "VHM — Half Marathon Sub 2",
      raceDate: dateInput.value || "2026-12-13T05:30:00",
      distanceKm: parseFloat(document.getElementById('event-input-distance').value) || 21.0975,
      targetTime: document.getElementById('event-input-time').value.trim() || "01:59:59",
      targetPace: document.getElementById('event-input-pace').value.trim() || "5'41\"",
      location: document.getElementById('event-input-location').value.trim() || "Road Race Course",
      bibNumber: document.getElementById('event-input-bib').value.trim() || "",
      notes: document.getElementById('event-input-notes').value.trim() || "",
      logo: this.tempLogoBase64 || null
    };

    this.saveEventData();
    this.closeEventModal();
    this.initCountdown();
    this.renderCalendar();
    return false;
  }

  // ================= CALENDAR RECAP ENGINE =================
  renderCalendar() {
    const container = document.getElementById('calendar-days-container');
    if (!container) return;

    const year = this.calDate.getFullYear();
    const month = this.calDate.getMonth(); // 0-indexed

    const monthNames = [
      'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
      'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
    ];
    document.getElementById('calendar-month-title').textContent = `${monthNames[month]} ${year}`;

    // Map all runs by YYYY-MM-DD
    const sessionsByDate = {};
    let monthTotalKm = 0;
    let monthTotalRuns = 0;
    let monthMaxLong = 0;
    let monthMinutes = 0;

    this.weeksData.forEach(w => {
      w.sessions.forEach(s => {
        let dateKey = s.date;
        if (!dateKey && s.dayName) {
          // extract DD/MM/YYYY
          const match = s.dayName.match(/(\d{1,2})\/(\d{1,2})\/(\d{4})/);
          if (match) {
            dateKey = `${match[3]}-${match[2].padStart(2, '0')}-${match[1].padStart(2, '0')}`;
          }
        }
        if (dateKey) {
          const iso = dateKey.split('T')[0];
          if (!sessionsByDate[iso]) sessionsByDate[iso] = [];
          sessionsByDate[iso].push({ ...s, weekId: w.id });

          // check if in this month
          const [sY, sM] = iso.split('-').map(Number);
          if (sY === year && (sM - 1) === month) {
            const km = parseFloat(s.distance) || 0;
            const mins = parseFloat(s.timeMinutes) || this.timeToMinutes(s.time);
            monthTotalKm += km;
            monthTotalRuns++;
            monthMinutes += mins;
            if (s.type === 'long_run' && km > monthMaxLong) monthMaxLong = km;
          }
        }
      });
    });

    // Update month summary strip
    document.getElementById('cal-month-km').textContent = `${monthTotalKm.toFixed(1)} km`;
    document.getElementById('cal-month-runs').textContent = `${monthTotalRuns} Sesi`;
    document.getElementById('cal-month-long').textContent = `${monthMaxLong.toFixed(1)} km`;
    const avgSec = monthTotalKm > 0 ? (monthMinutes * 60) / monthTotalKm : 0;
    document.getElementById('cal-month-pace').textContent = avgSec > 0 ? `${this.secondsToPace(avgSec)} /km` : '-';

    // Calendar grid calculation (Monday first convention)
    const firstDayOfMonth = new Date(year, month, 1);
    let startDayOfWeek = firstDayOfMonth.getDay(); // 0 is Sunday
    startDayOfWeek = (startDayOfWeek === 0) ? 6 : startDayOfWeek - 1; // convert to 0=Mon, 6=Sun

    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const daysInPrevMonth = new Date(year, month, 0).getDate();

    // Check race date
    const raceIso = this.raceEvent && this.raceEvent.raceDate ? this.raceEvent.raceDate.split('T')[0] : null;

    // Check today date
    const today = new Date();
    const todayIso = `${today.getFullYear()}-${(today.getMonth() + 1).toString().padStart(2, '0')}-${today.getDate().toString().padStart(2, '0')}`;

    let html = '';

    // 1. Previous month trailing days
    for (let i = startDayOfWeek - 1; i >= 0; i--) {
      const dayNum = daysInPrevMonth - i;
      const prevDate = new Date(year, month - 1, dayNum);
      const prevIso = `${prevDate.getFullYear()}-${(prevDate.getMonth() + 1).toString().padStart(2, '0')}-${dayNum.toString().padStart(2, '0')}`;
      html += this.renderCalendarCell(dayNum, prevIso, sessionsByDate[prevIso] || [], false, todayIso, raceIso);
    }

    // 2. Current month days
    for (let day = 1; day <= daysInMonth; day++) {
      const curIso = `${year}-${(month + 1).toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`;
      html += this.renderCalendarCell(day, curIso, sessionsByDate[curIso] || [], true, todayIso, raceIso);
    }

    // 3. Next month leading days (to fill 35 or 42 cells)
    const totalRendered = startDayOfWeek + daysInMonth;
    const remaining = totalRendered % 7 === 0 ? 0 : 7 - (totalRendered % 7);
    for (let nextDay = 1; nextDay <= remaining; nextDay++) {
      const nextDate = new Date(year, month + 1, nextDay);
      const nextIso = `${nextDate.getFullYear()}-${(nextDate.getMonth() + 1).toString().padStart(2, '0')}-${nextDay.toString().padStart(2, '0')}`;
      html += this.renderCalendarCell(nextDay, nextIso, sessionsByDate[nextIso] || [], false, todayIso, raceIso);
    }

    container.innerHTML = html;
    if (window.lucide) window.lucide.createIcons();
  }

  renderCalendarCell(dayNum, isoDate, sessions, isCurrentMonth, todayIso, raceIso) {
    const isToday = isoDate === todayIso;
    const isRaceDay = isoDate === raceIso;

    let cellClasses = 'calendar-day-cell ';
    if (!isCurrentMonth) cellClasses += 'calendar-day-other-month ';
    if (isToday) cellClasses += 'calendar-day-today ';
    if (isRaceDay) cellClasses += 'calendar-day-race ';

    let badgesHtml = '';
    let totalDayKm = 0;

    if (sessions.length > 0) {
      sessions.forEach(s => {
        const km = parseFloat(s.distance) || 0;
        totalDayKm += km;
        let badgeStyle = 'badge-easy';
        let shortName = 'Easy';

        if (s.type === 'tempo_run') {
          badgeStyle = 'badge-tempo';
          shortName = 'Tempo';
        } else if (s.type === 'interval_run') {
          badgeStyle = 'badge-interval';
          shortName = 'Interval';
        } else if (s.type === 'long_run') {
          badgeStyle = 'badge-long';
          shortName = 'Long Run';
        }

        badgesHtml += `
          <div class="px-1.5 py-0.5 rounded text-[9px] sm:text-[10px] font-bold ${badgeStyle} flex items-center justify-between mb-1 truncate" title="${s.categoryTitle}: ${km}km (${s.pace})">
            <span class="truncate">${shortName}</span>
            <span class="font-mono-numbers shrink-0 font-extrabold ml-1">${km ? km + 'k' : ''}</span>
          </div>
        `;
      });
    }

    if (isRaceDay) {
      badgesHtml += `
        <div class="px-1.5 py-0.5 rounded text-[9px] sm:text-[10px] font-bold bg-rose-500 text-white flex items-center justify-between animate-pulse">
          <span>🏁 RACE DAY</span>
          <span class="text-[9px]">21.1k</span>
        </div>
      `;
    }

    return `
      <div class="${cellClasses}" onclick="window.app.handleCalendarCellClick('${isoDate}')">
        <div class="flex items-center justify-between mb-1">
          <span class="text-xs sm:text-sm font-bold font-mono-numbers ${isToday ? 'text-indigo-400 font-black' : isCurrentMonth ? 'text-slate-200' : 'text-slate-500'}">
            ${dayNum}
          </span>
          ${totalDayKm > 0 ? `
            <span class="text-[9px] sm:text-[10px] font-bold font-mono-numbers text-emerald-400 bg-emerald-500/10 px-1 py-0.2 rounded border border-emerald-500/20">
              ${totalDayKm.toFixed(1)}k
            </span>
          ` : ''}
        </div>
        <div class="flex-1 flex flex-col justify-end">
          ${badgesHtml}
        </div>
      </div>
    `;
  }

  handleCalendarCellClick(isoDate) {
    // Find sessions on this date
    let foundSession = null;
    let foundWeekId = null;

    for (const w of this.weeksData) {
      for (const s of w.sessions) {
        if (s.date === isoDate || (s.dayName && s.dayName.includes(isoDate.split('-').reverse().join('/')))) {
          foundSession = s;
          foundWeekId = w.id;
          break;
        }
      }
      if (foundSession) break;
    }

    if (foundSession) {
      // Edit existing session
      this.editSession(foundWeekId, foundSession.id);
    } else {
      // Add new session for this date
      this.openAddSessionModal();
      document.getElementById('field-date').value = isoDate;
    }
  }

  prevMonth() {
    this.calDate = new Date(this.calDate.getFullYear(), this.calDate.getMonth() - 1, 1);
    this.renderCalendar();
  }

  nextMonth() {
    this.calDate = new Date(this.calDate.getFullYear(), this.calDate.getMonth() + 1, 1);
    this.renderCalendar();
  }

  currentMonthJump() {
    const now = new Date();
    this.calDate = new Date(now.getFullYear(), now.getMonth(), 1);
    this.renderCalendar();
  }

  // ================= METRICS & STATS =================
  calculateMetrics() {
    let totalKm = 0;
    let totalMinutes = 0;
    let totalRuns = 0;
    let totalHrSum = 0;
    let hrCount = 0;
    let maxLongRun = 0;
    let bestTempoPaceSec = Infinity;
    let bestIntervalPaceSec = Infinity;

    this.weeksData.forEach(w => {
      w.sessions.forEach(s => {
        totalRuns++;
        const km = parseFloat(s.distance) || 0;
        const mins = parseFloat(s.timeMinutes) || this.timeToMinutes(s.time);
        totalKm += km;
        totalMinutes += mins;

        if (s.hr && !isNaN(s.hr)) {
          totalHrSum += parseFloat(s.hr);
          hrCount++;
        }

        if (s.type === 'long_run' && km > maxLongRun) maxLongRun = km;

        if (s.type === 'tempo_run') {
          const paceSec = this.paceToSeconds(s.pace);
          if (paceSec && paceSec < bestTempoPaceSec) bestTempoPaceSec = paceSec;
          if (s.segments) {
            s.segments.forEach(seg => {
              if (seg.name.toLowerCase().includes('tempo')) {
                const segPaceSec = this.paceToSeconds(seg.pace);
                if (segPaceSec && segPaceSec < bestTempoPaceSec) bestTempoPaceSec = segPaceSec;
              }
            });
          }
        }

        if (s.type === 'interval_run' && s.sets) {
          s.sets.forEach(st => {
            const stPaceSec = this.paceToSeconds(st.pace);
            if (stPaceSec && stPaceSec < bestIntervalPaceSec) bestIntervalPaceSec = stPaceSec;
          });
        }
      });
    });

    const avgPaceSec = totalKm > 0 ? (totalMinutes * 60) / totalKm : 0;
    const avgHr = hrCount > 0 ? Math.round(totalHrSum / hrCount) : 0;

    return {
      totalKm: totalKm.toFixed(1),
      totalRuns,
      avgPace: this.secondsToPace(avgPaceSec),
      avgHr,
      maxLongRun: maxLongRun.toFixed(1)
    };
  }

  renderSummaryStats() {
    const m = this.calculateMetrics();
    document.getElementById('stat-total-km').textContent = `${m.totalKm} km`;
    document.getElementById('stat-total-runs').textContent = `${m.totalRuns} Sesi`;
    document.getElementById('stat-avg-pace').textContent = `${m.avgPace} /km`;
    document.getElementById('stat-avg-hr').textContent = `${m.avgHr || '-'} bpm`;
  }

  // ================= TRAINING CONTENT RENDERING =================
  renderTrainingContent() {
    const cardViewContainer = document.getElementById('card-view-container');
    const excelViewContainer = document.getElementById('excel-view-container');

    if (this.currentView === 'cards') {
      cardViewContainer.classList.remove('hidden');
      excelViewContainer.classList.add('hidden');
      this.renderCardView();
    } else {
      cardViewContainer.classList.add('hidden');
      excelViewContainer.classList.remove('hidden');
      this.renderExcelView();
    }
  }

  selectWeekTab(weekId) {
    this.selectedWeekTab = weekId;
    this.renderCardView();
  }

  toggleWeekCollapse(weekId) {
    this.collapsedWeeks[weekId] = !this.collapsedWeeks[weekId];
    this.renderCardView();
  }

  setAllWeeksCollapse(collapse) {
    this.weeksData.forEach(w => {
      this.collapsedWeeks[w.id] = collapse;
    });
    this.renderCardView();
  }

  renderCardView() {
    const container = document.getElementById('card-view-container');
    if (!container) return;

    if (this.weeksData.length === 0) {
      container.innerHTML = `
        <div class="p-10 text-center text-slate-400 glass-card rounded-2xl">
          <p class="text-base font-medium">Belum ada data sesi latihan.</p>
          <p class="text-xs mt-1">Klik tombol "+ Catat Lari" untuk memulai.</p>
        </div>
      `;
      return;
    }

    // 1. Folder / Week Tabs Bar
    const tabsHtml = `
      <div class="mb-5 p-2.5 rounded-2xl glass-panel border border-slate-700/60 flex flex-col md:flex-row md:items-center justify-between gap-3 shadow-lg">
        <div class="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5">
          <button onclick="window.app.selectWeekTab('all')" 
            class="px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all flex items-center gap-1.5 ${this.selectedWeekTab === 'all' ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30' : 'bg-slate-800/80 hover:bg-slate-700 text-slate-300 border border-slate-700/60'}">
            <i data-lucide="folder-archive" class="w-3.5 h-3.5"></i>
            Semua Minggu (${this.weeksData.length})
          </button>
          ${this.weeksData.map(week => {
            const isSelected = this.selectedWeekTab === week.id;
            const weekKm = week.sessions.reduce((acc, s) => acc + (parseFloat(s.distance) || 0), 0).toFixed(1);
            return `
              <button onclick="window.app.selectWeekTab('${week.id}')"
                class="px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all flex items-center gap-1.5 ${isSelected ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30' : 'bg-slate-800/80 hover:bg-slate-700 text-slate-300 border border-slate-700/60'}">
                <i data-lucide="folder" class="w-3.5 h-3.5 ${isSelected ? 'text-white' : 'text-indigo-400'}"></i>
                ${week.title}
                <span class="text-[10px] opacity-75 font-normal">(${weekKm}k)</span>
              </button>
            `;
          }).join('')}
        </div>
        <div class="flex items-center justify-end gap-1.5 border-t md:border-t-0 pt-2 md:pt-0 border-slate-800 shrink-0">
          <button onclick="window.app.setAllWeeksCollapse(false)" class="text-[11px] px-2.5 py-1 rounded-lg bg-slate-800/80 hover:bg-slate-700 text-slate-300 border border-slate-700/50 flex items-center gap-1">
            <i data-lucide="chevrons-down" class="w-3 h-3 text-emerald-400"></i> Buka Semua
          </button>
          <button onclick="window.app.setAllWeeksCollapse(true)" class="text-[11px] px-2.5 py-1 rounded-lg bg-slate-800/80 hover:bg-slate-700 text-slate-300 border border-slate-700/50 flex items-center gap-1">
            <i data-lucide="chevrons-up" class="w-3 h-3 text-amber-400"></i> Lipat Semua
          </button>
        </div>
      </div>
    `;

    // 2. Filter weeks based on selected tab
    const weeksToDisplay = this.selectedWeekTab === 'all' 
      ? this.weeksData 
      : this.weeksData.filter(w => w.id === this.selectedWeekTab);

    // 3. Render Week Cards
    const cardsHtml = weeksToDisplay.map(week => {
      const filteredSessions = week.sessions.filter(s => {
        if (this.currentFilter === 'all') return true;
        return s.type === this.currentFilter;
      });

      if (filteredSessions.length === 0 && this.currentFilter !== 'all') return '';

      const totalWeekKm = week.sessions.reduce((acc, s) => acc + (parseFloat(s.distance) || 0), 0).toFixed(1);
      const totalWeekRuns = week.sessions.length;
      const isCollapsed = !!this.collapsedWeeks[week.id];

      return `
        <div class="glass-panel rounded-2xl mb-4 border border-slate-700/60 shadow-xl overflow-hidden transition-all" id="week-card-${week.id}">
          <!-- Clickable Accordion Header -->
          <div class="p-4 sm:p-5 flex flex-wrap items-center justify-between gap-2.5 cursor-pointer hover:bg-slate-800/40 select-none transition-colors border-b ${isCollapsed ? 'border-transparent' : 'border-slate-700/60'}"
               onclick="window.app.toggleWeekCollapse('${week.id}')">
            
            <div class="flex items-center gap-2.5">
              <button type="button" class="w-7 h-7 rounded-lg bg-slate-800 border border-slate-700 text-slate-300 flex items-center justify-center transition-transform duration-200 ${isCollapsed ? '' : 'rotate-180'}">
                <i data-lucide="chevron-down" class="w-4 h-4"></i>
              </button>
              <span class="px-2.5 py-1 rounded-lg bg-indigo-600/20 text-indigo-400 border border-indigo-500/30 font-bold text-xs sm:text-sm tracking-wide flex items-center gap-1.5">
                <i data-lucide="${isCollapsed ? 'folder' : 'folder-open'}" class="w-3.5 h-3.5 text-indigo-400"></i>
                ${week.title}
              </span>
              <span class="text-xs text-slate-400 hidden sm:inline">${week.notes || ''}</span>
              ${isCollapsed ? `
                <span class="text-[11px] text-amber-400/90 font-medium px-2 py-0.5 rounded-full bg-amber-500/10 border border-amber-500/20">
                  (Dilipat • ${totalWeekKm} km)
                </span>
              ` : ''}
            </div>

            <div class="flex items-center gap-2 sm:gap-3 text-xs font-medium text-slate-300" onclick="event.stopPropagation()">
              <span class="bg-slate-800/80 px-2.5 py-1 rounded-lg border border-slate-700 text-[11px] sm:text-xs">
                Jarak: <strong class="text-white">${totalWeekKm} km</strong>
              </span>
              <span class="bg-slate-800/80 px-2.5 py-1 rounded-lg border border-slate-700 text-[11px] sm:text-xs">
                Sesi: <strong class="text-white">${totalWeekRuns} Lari</strong>
              </span>
              <button onclick="window.app.deleteWeek('${week.id}')" title="Hapus Minggu" class="text-slate-500 hover:text-rose-400 p-1">
                <i data-lucide="trash-2" class="w-3.5 h-3.5"></i>
              </button>
            </div>
          </div>

          <!-- Sessions Grid (Hidden when collapsed) -->
          <div class="p-4 sm:p-5 pt-2 ${isCollapsed ? 'hidden' : ''}">
            <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-4 pt-2">
              ${filteredSessions.length > 0 ? filteredSessions.map(session => this.renderSessionCard(session, week.id)).join('') : `
                <div class="col-span-full py-4 text-center text-xs text-slate-500 italic">
                  Tidak ada sesi sesuai filter ini.
                </div>
              `}
            </div>
          </div>
        </div>
      `;
    }).join('');

    container.innerHTML = tabsHtml + cardsHtml;

    if (window.lucide) window.lucide.createIcons();
  }

  renderSessionCard(s, weekId) {
    let badgeClass = 'badge-easy';
    let typeName = 'Easy Run';
    let typeIcon = 'heart';

    if (s.type === 'tempo_run') {
      badgeClass = 'badge-tempo';
      typeName = 'Tempo Run';
      typeIcon = 'zap';
    } else if (s.type === 'interval_run') {
      badgeClass = 'badge-interval';
      typeName = 'Interval Run';
      typeIcon = 'timer';
    } else if (s.type === 'long_run') {
      badgeClass = 'badge-long';
      typeName = 'Long Run';
      typeIcon = 'mountain';
    }

    let detailSectionHtml = '';

    if (s.type === 'interval_run' && s.sets && s.sets.length > 0) {
      detailSectionHtml = `
        <div class="mt-2.5 pt-2.5 border-t border-slate-700/60 text-xs">
          <div class="text-[10px] font-semibold text-rose-400 uppercase tracking-wider mb-1.5 flex items-center justify-between">
            <span>${s.setsTitle || 'Interval Sets'}</span>
            <span class="text-[10px] font-normal text-slate-400">${s.sets.length} repetisi</span>
          </div>
          <div class="rounded-lg bg-slate-900/80 border border-slate-800 overflow-hidden text-[11px]">
            <!-- Header Kolom Keterangan -->
            <div class="grid grid-cols-12 gap-1 px-2.5 py-1 bg-slate-800/90 text-[10px] font-semibold text-slate-400 uppercase tracking-wider border-b border-slate-700/60">
              <div class="col-span-2">Set</div>
              <div class="col-span-3 text-center">Target</div>
              <div class="col-span-3 text-center">Waktu</div>
              <div class="col-span-2 text-center">Pace</div>
              <div class="col-span-2 text-right">HR</div>
            </div>
            <!-- Rows Interval Rapi & Sejajar -->
            <div class="divide-y divide-slate-800/60 max-h-36 overflow-y-auto">
              ${s.sets.map(st => `
                <div class="grid grid-cols-12 gap-1 px-2.5 py-1.5 items-center hover:bg-slate-800/40 transition-colors">
                  <div class="col-span-2 font-bold text-slate-400">#${st.setNumber}</div>
                  <div class="col-span-3 text-center font-medium text-slate-200 truncate" title="${st.target}">${st.target || '-'}</div>
                  <div class="col-span-3 text-center font-mono-numbers text-amber-300 font-semibold">${st.time || '-'}</div>
                  <div class="col-span-2 text-center font-mono-numbers text-rose-300 font-semibold">${st.pace || '-'}</div>
                  <div class="col-span-2 text-right font-mono-numbers text-slate-300 text-[10px]">${st.hr ? st.hr : '-'}</div>
                </div>
              `).join('')}
            </div>
          </div>
        </div>
      `;
    } else if (s.type === 'tempo_run' && s.segments && s.segments.length > 0) {
      detailSectionHtml = `
        <div class="mt-2.5 pt-2.5 border-t border-slate-700/60 text-xs">
          <div class="text-[10px] font-semibold text-amber-400 uppercase tracking-wider mb-1.5 flex items-center justify-between">
            <span>Segmen Tempo</span>
            <span class="text-[10px] font-normal text-slate-400">${s.segments.length} fase</span>
          </div>
          <div class="rounded-lg bg-slate-900/80 border border-slate-800 overflow-hidden text-[11px]">
            <!-- Header Kolom Keterangan Sejajar -->
            <div class="grid grid-cols-12 gap-1 px-2.5 py-1 bg-slate-800/90 text-[10px] font-semibold text-slate-400 uppercase tracking-wider border-b border-slate-700/60">
              <div class="col-span-5">Fase / Segmen</div>
              <div class="col-span-3 text-center">Pace</div>
              <div class="col-span-2 text-right">Jarak</div>
              <div class="col-span-2 text-right">Waktu</div>
            </div>
            <!-- Rows Segmen Tempo Rapi & Sejajar -->
            <div class="divide-y divide-slate-800/60 max-h-36 overflow-y-auto">
              ${s.segments.map(seg => `
                <div class="grid grid-cols-12 gap-1 px-2.5 py-1.5 items-center hover:bg-slate-800/40 transition-colors">
                  <div class="col-span-5 font-medium text-slate-200 truncate" title="${seg.name}">
                    ${seg.name}
                  </div>
                  <div class="col-span-3 text-center font-mono-numbers text-amber-300 font-bold">
                    ${seg.pace && seg.pace !== '-' ? seg.pace : '-'}
                  </div>
                  <div class="col-span-2 text-right font-mono-numbers text-slate-300">
                    ${seg.distance ? seg.distance + 'k' : '-'}
                  </div>
                  <div class="col-span-2 text-right font-mono-numbers text-slate-400 text-[10px]">
                    ${seg.time && seg.time !== '-' ? seg.time : '-'}
                  </div>
                </div>
              `).join('')}
            </div>
          </div>
        </div>
      `;
    }

    return `
      <div class="glass-card rounded-xl p-3.5 flex flex-col justify-between border border-slate-700/60 hover:border-slate-500 transition-all">
        <div>
          <!-- Header Card -->
          <div class="flex items-start justify-between gap-1.5 mb-1.5">
            <span class="px-2 py-0.5 rounded-md text-[11px] font-bold ${badgeClass} flex items-center gap-1.5">
              <i data-lucide="${typeIcon}" class="w-3 h-3"></i>
              ${typeName}
            </span>
            <div class="flex items-center gap-0.5">
              <button onclick="window.app.editSession('${weekId}', '${s.id}')" title="Edit Sesi" class="text-slate-400 hover:text-indigo-400 p-1">
                <i data-lucide="edit-3" class="w-3.5 h-3.5"></i>
              </button>
              <button onclick="window.app.deleteSession('${weekId}', '${s.id}')" title="Hapus Sesi" class="text-slate-400 hover:text-rose-400 p-1">
                <i data-lucide="trash-2" class="w-3.5 h-3.5"></i>
              </button>
            </div>
          </div>

          <div class="text-[11px] font-medium text-slate-400 mb-1 flex items-center gap-1">
            <i data-lucide="calendar" class="w-3 h-3"></i>
            ${s.dayName || s.date}
            ${s.location ? `<span class="ml-auto text-[9px] px-1.5 py-0.2 rounded bg-slate-800 text-slate-400 border border-slate-700">${s.location}</span>` : ''}
          </div>

          <!-- Main Metric Numbers -->
          <div class="grid grid-cols-2 gap-1.5 my-2.5 p-2 rounded-lg bg-slate-900/60 border border-slate-800">
            <div>
              <div class="text-[9px] uppercase tracking-wider text-slate-400">Jarak</div>
              <div class="text-base font-bold font-mono-numbers text-white">${s.distance ? s.distance + ' km' : '-'}</div>
            </div>
            <div>
              <div class="text-[9px] uppercase tracking-wider text-slate-400">Rerata Pace</div>
              <div class="text-base font-bold font-mono-numbers text-emerald-400">${s.pace || '-'}</div>
            </div>
            <div>
              <div class="text-[9px] uppercase tracking-wider text-slate-400">Waktu</div>
              <div class="text-xs font-semibold font-mono-numbers text-slate-300">${s.time || '-'}</div>
            </div>
            <div>
              <div class="text-[9px] uppercase tracking-wider text-slate-400">Heart Rate</div>
              <div class="text-xs font-semibold font-mono-numbers text-rose-400">${s.hr ? s.hr + ' bpm' : '-'}</div>
            </div>
          </div>

          ${detailSectionHtml}

          ${s.notes ? `
            <p class="text-[10px] text-slate-400 mt-2 italic line-clamp-2" title="${s.notes}">
              "${s.notes}"
            </p>
          ` : ''}
        </div>
      </div>
    `;
  }

  // ================= EXCEL SPREADSHEET VIEW =================
  renderExcelView() {
    const container = document.getElementById('excel-view-container');
    if (!container) return;

    container.innerHTML = `
      <div class="excel-table-container shadow-2xl">
        <table class="excel-table">
          <thead>
            <tr>
              <th class="excel-row-num">#</th>
              <th class="excel-header-col">Parameter</th>
              ${this.weeksData.map(w => `
                <th colspan="4" class="excel-header-col bg-slate-800 text-indigo-300 border-x-2 border-indigo-500/40 font-bold py-1.5">
                  ${w.title}
                </th>
              `).join('')}
            </tr>
            <tr>
              <th class="excel-row-num"></th>
              <th class="excel-header-col text-slate-400">Metrik</th>
              ${this.weeksData.map(() => `
                <th class="excel-cell-easy text-center text-[11px] font-bold text-emerald-400 border-l">Easy Run</th>
                <th class="excel-cell-tempo text-center text-[11px] font-bold text-amber-400">Tempo Run</th>
                <th class="excel-cell-interval text-center text-[11px] font-bold text-rose-400">Interval Run</th>
                <th class="excel-cell-long text-center text-[11px] font-bold text-blue-400 border-r-2 border-indigo-500/40">Long Run</th>
              `).join('')}
            </tr>
          </thead>
          <tbody>
            ${this.renderExcelRows()}
          </tbody>
        </table>
      </div>
    `;

    if (window.lucide) window.lucide.createIcons();
  }

  renderExcelRows() {
    const rows = [
      { key: 'date', label: 'Hari / Tanggal' },
      { key: 'distance', label: 'Distance (km)' },
      { key: 'time', label: 'Time' },
      { key: 'pace', label: 'Pace (min/km)' },
      { key: 'hr', label: 'Heart Rate (bpm)' },
      { key: 'location', label: 'Indoor / Outdoor' }
    ];

    return rows.map((r, idx) => `
      <tr class="${idx % 2 === 0 ? 'bg-slate-900/40' : 'bg-slate-900/80'}">
        <td class="excel-row-num">${idx + 1}</td>
        <td class="font-semibold text-slate-300">${r.label}</td>
        ${this.weeksData.map(w => {
          const easy = w.sessions.find(s => s.type === 'easy_run') || {};
          const tempo = w.sessions.find(s => s.type === 'tempo_run') || {};
          const interval = w.sessions.find(s => s.type === 'interval_run') || {};
          const longRun = w.sessions.find(s => s.type === 'long_run') || {};

          return `
            <td class="excel-cell-easy font-mono-numbers text-center">${this.getExcelCellValue(easy, r.key)}</td>
            <td class="excel-cell-tempo font-mono-numbers text-center">${this.getExcelCellValue(tempo, r.key)}</td>
            <td class="excel-cell-interval font-mono-numbers text-center">${this.getExcelCellValue(interval, r.key)}</td>
            <td class="excel-cell-long font-mono-numbers text-center border-r-2 border-indigo-500/40">${this.getExcelCellValue(longRun, r.key)}</td>
          `;
        }).join('')}
      </tr>
    `).join('');
  }

  getExcelCellValue(session, key) {
    if (!session || Object.keys(session).length === 0) return '-';
    if (key === 'date') return session.dayName || session.date || '-';
    if (key === 'distance') return session.distance ? `${session.distance} km` : '-';
    if (key === 'time') return session.time || '-';
    if (key === 'pace') return session.pace || '-';
    if (key === 'hr') return session.hr ? `${session.hr} bpm` : '-';
    if (key === 'location') return session.location || (session.type === 'easy_run' ? 'Indoor' : 'Outdoor');
    return '-';
  }

  // ================= CHARTS =================
  initCharts() {
    if (!window.Chart) return;

    // Mileage Chart
    const ctxMileage = document.getElementById('chart-mileage');
    if (ctxMileage) {
      const labels = this.weeksData.map(w => w.title);
      const datasets = [
        {
          label: 'Easy Run',
          backgroundColor: 'rgba(16, 185, 129, 0.75)',
          data: this.weeksData.map(w => {
            const s = w.sessions.find(x => x.type === 'easy_run');
            return s ? parseFloat(s.distance) || 0 : 0;
          })
        },
        {
          label: 'Tempo Run',
          backgroundColor: 'rgba(245, 158, 11, 0.75)',
          data: this.weeksData.map(w => {
            const s = w.sessions.find(x => x.type === 'tempo_run');
            return s ? parseFloat(s.distance) || 0 : 0;
          })
        },
        {
          label: 'Interval Run',
          backgroundColor: 'rgba(244, 63, 94, 0.75)',
          data: this.weeksData.map(w => {
            const s = w.sessions.find(x => x.type === 'interval_run');
            return s ? parseFloat(s.distance) || 0 : 0;
          })
        },
        {
          label: 'Long Run',
          backgroundColor: 'rgba(59, 130, 246, 0.75)',
          data: this.weeksData.map(w => {
            const s = w.sessions.find(x => x.type === 'long_run');
            return s ? parseFloat(s.distance) || 0 : 0;
          })
        }
      ];

      if (this.charts.mileage) this.charts.mileage.destroy();
      this.charts.mileage = new Chart(ctxMileage, {
        type: 'bar',
        data: { labels, datasets },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: {
              position: 'bottom',
              labels: { color: '#94a3b8', font: { size: 10 } }
            }
          },
          scales: {
            x: {
              stacked: true,
              grid: { color: 'rgba(255, 255, 255, 0.05)' },
              ticks: { color: '#94a3b8', font: { size: 10 } }
            },
            y: {
              stacked: true,
              grid: { color: 'rgba(255, 255, 255, 0.05)' },
              ticks: { color: '#94a3b8', font: { size: 10 } }
            }
          }
        }
      });
    }

    // Pace Chart
    const ctxPace = document.getElementById('chart-pace');
    if (ctxPace) {
      const labels = this.weeksData.map(w => w.title);
      const getPaceArray = (type) => this.weeksData.map(w => {
        const s = w.sessions.find(x => x.type === type);
        if (!s || !s.pace) return null;
        const sec = this.paceToSeconds(s.pace);
        return sec ? (sec / 60).toFixed(2) : null;
      });

      if (this.charts.pace) this.charts.pace.destroy();
      this.charts.pace = new Chart(ctxPace, {
        type: 'line',
        data: {
          labels,
          datasets: [
            {
              label: 'Easy Run',
              borderColor: '#10b981',
              backgroundColor: '#10b981',
              tension: 0.3,
              data: getPaceArray('easy_run'),
              pointRadius: 4
            },
            {
              label: 'Tempo Run',
              borderColor: '#f59e0b',
              backgroundColor: '#f59e0b',
              tension: 0.3,
              data: getPaceArray('tempo_run'),
              pointRadius: 4
            },
            {
              label: 'Interval (Avg)',
              borderColor: '#f43f5e',
              backgroundColor: '#f43f5e',
              tension: 0.3,
              data: getPaceArray('interval_run'),
              pointRadius: 4
            },
            {
              label: 'Long Run',
              borderColor: '#3b82f6',
              backgroundColor: '#3b82f6',
              tension: 0.3,
              data: getPaceArray('long_run'),
              pointRadius: 4
            },
            {
              label: 'Sub-2 Target (5:41)',
              borderColor: '#e11d48',
              borderDash: [5, 5],
              pointRadius: 0,
              data: labels.map(() => (341 / 60).toFixed(2)),
              fill: false
            }
          ]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: {
              position: 'bottom',
              labels: { color: '#94a3b8', font: { size: 10 } }
            }
          },
          scales: {
            x: {
              grid: { color: 'rgba(255, 255, 255, 0.05)' },
              ticks: { color: '#94a3b8', font: { size: 10 } }
            },
            y: {
              reverse: true,
              grid: { color: 'rgba(255, 255, 255, 0.05)' },
              ticks: {
                color: '#94a3b8',
                font: { size: 10 },
                callback: (val) => {
                  const m = Math.floor(val);
                  const s = Math.round((val - m) * 60);
                  return `${m}'${s < 10 ? '0' : ''}${s}"`;
                }
              }
            }
          }
        }
      });
    }
  }

  // ================= HELPERS & CONVERTERS =================
  // Standardize user time input:
  // "1:40" -> 1 jam 40 menit (01:40:00)
  // "30" -> 30 menit (30:00)
  // "45:12" -> 45 menit 12 detik (45:12)
  // "1:40:15" -> 1 jam 40 menit 15 detik (01:40:15)
  parseAndFormatRunningTime(timeStr) {
    if (!timeStr) return { formatted: '', totalSeconds: 0, minutes: 0, preview: '' };
    const str = timeStr.toString().trim();
    if (!str) return { formatted: '', totalSeconds: 0, minutes: 0, preview: '' };

    const clean = str.replace(/[^\d:]/g, '');
    const parts = clean.split(':').map(p => parseInt(p, 10) || 0);

    let hours = 0;
    let minutes = 0;
    let seconds = 0;

    if (parts.length === 1) {
      // Single number (misal "30" -> 30 menit)
      const val = parts[0];
      if (val >= 60) {
        hours = Math.floor(val / 60);
        minutes = val % 60;
      } else {
        minutes = val;
      }
    } else if (parts.length === 2) {
      if (parts[0] < 10 && parts[0] > 0) {
        // H:MM (misal "1:40" -> 1 jam 40 menit)
        hours = parts[0];
        minutes = parts[1];
      } else if (parts[0] === 0) {
        // 0:45 -> 45 menit
        minutes = parts[1];
      } else {
        // MM:SS (misal "45:12" -> 45 menit 12 detik)
        minutes = parts[0];
        seconds = parts[1];
        if (minutes >= 60) {
          hours = Math.floor(minutes / 60);
          minutes = minutes % 60;
        }
      }
    } else if (parts.length >= 3) {
      // H:MM:SS (misal 1:40:15 atau 0:45:12)
      hours = parts[0];
      minutes = parts[1];
      seconds = parts[2];
    }

    const totalSeconds = hours * 3600 + minutes * 60 + seconds;
    const totalMinutes = totalSeconds / 60;

    const pad = (n) => n.toString().padStart(2, '0');
    let formatted = '';
    let preview = '';

    if (hours > 0) {
      formatted = `${hours}:${pad(minutes)}:${pad(seconds)}`;
      preview = `${hours}j ${minutes}m${seconds > 0 ? ' ' + seconds + 'd' : ''}`;
    } else {
      formatted = `${pad(minutes)}:${pad(seconds)}`;
      preview = `${minutes}m${seconds > 0 ? ' ' + seconds + 'd' : ''}`;
    }

    return {
      formatted,
      totalSeconds,
      minutes: totalMinutes,
      preview,
      hours,
      mins: minutes,
      secs: seconds
    };
  }

  timeToMinutes(timeStr) {
    if (!timeStr) return 0;
    if (typeof timeStr === 'number') return timeStr;
    const parsed = this.parseAndFormatRunningTime(timeStr);
    return parsed.minutes || 0;
  }

  paceToSeconds(paceStr) {
    if (!paceStr) return null;
    const clean = paceStr.toString().replace(/[^\d:']/g, '');
    let parts = clean.split("'");
    if (parts.length < 2) parts = clean.split(':');
    if (parts.length >= 2) {
      const min = parseInt(parts[0], 10) || 0;
      const sec = parseInt(parts[1], 10) || 0;
      return min * 60 + sec;
    }
    const num = parseFloat(clean);
    if (!isNaN(num)) {
      const min = Math.floor(num);
      const sec = Math.round((num - min) * 60);
      return min * 60 + sec;
    }
    return null;
  }

  secondsToPace(seconds) {
    if (!seconds || isNaN(seconds) || seconds <= 0 || !isFinite(seconds)) return "-";
    const m = Math.floor(seconds / 60);
    const s = Math.round(seconds % 60);
    return `${m}'${s < 10 ? '0' : ''}${s}"`;
  }

  secondsToTimeString(totalSeconds) {
    if (!totalSeconds || totalSeconds <= 0) return '';
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    const pad = (n) => n.toString().padStart(2, '0');
    if (hours > 0) {
      return `${hours}:${pad(minutes)}:${pad(seconds)}`;
    }
    return `${pad(minutes)}:${pad(seconds)}`;
  }

  // Auto-calculate: Isi 2 dari 3 (Jarak, Waktu, Pace), yang kosong otomatis terisi
  autoCalculateMetrics(trigger = 'distance') {
    const distEl = document.getElementById('field-distance');
    const timeEl = document.getElementById('field-time');
    const paceEl = document.getElementById('field-pace');
    const badgeEl = document.getElementById('time-preview-badge');

    if (!distEl || !timeEl || !paceEl) return;

    // Otomatis ganti koma jadi titik saat user mengetik jarak
    if (distEl.value.includes(',')) {
      distEl.value = distEl.value.replace(',', '.');
    }

    const rawDist = distEl.value.trim();
    const rawTime = timeEl.value.trim();
    const rawPace = paceEl.value.trim();

    const distance = parseFloat(rawDist);
    const hasDist = !isNaN(distance) && distance > 0;

    const parsedTime = this.parseAndFormatRunningTime(rawTime);
    const hasTime = parsedTime.totalSeconds > 0;

    const paceSec = this.paceToSeconds(rawPace);
    const hasPace = paceSec !== null && paceSec > 0;

    // Tampilkan pratinjau waktu (misal: 1j 40m atau 45m 12d)
    if (badgeEl) {
      if (hasTime && parsedTime.preview) {
        badgeEl.textContent = `⏱️ ${parsedTime.preview}`;
        badgeEl.classList.remove('hidden');
      } else {
        badgeEl.classList.add('hidden');
      }
    }

    if (trigger === 'distance') {
      if (hasDist && hasTime && !hasPace) {
        const pSec = Math.round(parsedTime.totalSeconds / distance);
        paceEl.value = this.secondsToPace(pSec);
      } else if (hasDist && hasPace && !hasTime) {
        const totalSec = Math.round(distance * paceSec);
        timeEl.value = this.secondsToTimeString(totalSec);
      }
    } else if (trigger === 'time') {
      if (hasTime && hasDist && !hasPace) {
        const pSec = Math.round(parsedTime.totalSeconds / distance);
        paceEl.value = this.secondsToPace(pSec);
      } else if (hasTime && hasPace && !hasDist) {
        const calcDist = (parsedTime.totalSeconds / paceSec).toFixed(2);
        distEl.value = calcDist;
      }
    } else if (trigger === 'pace') {
      if (hasPace && hasDist && !hasTime) {
        const totalSec = Math.round(distance * paceSec);
        timeEl.value = this.secondsToTimeString(totalSec);
      } else if (hasPace && hasTime && !hasDist) {
        const calcDist = (parsedTime.totalSeconds / paceSec).toFixed(2);
        distEl.value = calcDist;
      }
    }
  }

  // Interval Mode (Berdasarkan Jarak vs Berdasarkan Waktu)
  setIntervalMode(mode) {
    this.intervalMode = mode; // 'distance' or 'time'
    const btnDist = document.getElementById('btn-interval-mode-dist');
    const btnTime = document.getElementById('btn-interval-mode-time');
    const masterInput = document.getElementById('field-interval-master-val');
    const labelMaster = document.getElementById('label-interval-master');
    const thTarget = document.getElementById('th-interval-target');

    if (mode === 'distance') {
      if (btnDist) {
        btnDist.className = 'px-2.5 py-1 rounded-md font-semibold transition-all bg-indigo-600 text-white';
      }
      if (btnTime) {
        btnTime.className = 'px-2.5 py-1 rounded-md font-semibold transition-all text-slate-400 hover:text-white';
      }
      if (labelMaster) labelMaster.textContent = 'Jarak Repetisi:';
      if (masterInput && (!masterInput.value || masterInput.value.includes(':'))) masterInput.value = '400m';
      if (thTarget) thTarget.textContent = 'Jarak Target';
    } else {
      if (btnTime) {
        btnTime.className = 'px-2.5 py-1 rounded-md font-semibold transition-all bg-indigo-600 text-white';
      }
      if (btnDist) {
        btnDist.className = 'px-2.5 py-1 rounded-md font-semibold transition-all text-slate-400 hover:text-white';
      }
      if (labelMaster) labelMaster.textContent = 'Durasi Waktu:';
      if (masterInput && (!masterInput.value || masterInput.value.includes('m') || masterInput.value.includes('k'))) masterInput.value = '02:00';
      if (thTarget) thTarget.textContent = 'Durasi Target';
    }
  }

  applyMasterIntervalValue() {
    const masterInput = document.getElementById('field-interval-master-val');
    if (!masterInput) return;
    const val = masterInput.value.trim();
    if (!val) return;

    const targets = document.querySelectorAll('#interval-sets-table-body .set-target');
    targets.forEach(input => {
      input.value = val;
    });
    this.showToast(`Target repetisi diseragamkan ke ${val}`);
  }

  // ================= SINKRONISASI DATA HP ⇄ LAPTOP =================
  openSyncModal() {
    const modal = document.getElementById('modal-sync');
    if (modal) modal.classList.remove('hidden');
    if (window.lucide) window.lucide.createIcons();
  }

  closeSyncModal() {
    const modal = document.getElementById('modal-sync');
    if (modal) modal.classList.add('hidden');
  }

  copySyncCode() {
    const bundle = {
      vhmVersion: 1,
      timestamp: Date.now(),
      weeksData: this.weeksData,
      raceEvent: this.raceEvent
    };
    const jsonStr = JSON.stringify(bundle);
    const base64 = btoa(unescape(encodeURIComponent(jsonStr)));

    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(base64).then(() => {
        this.showToast('Kode data berhasil disalin ke clipboard!');
      }).catch(() => {
        this.fallbackCopyText(base64);
      });
    } else {
      this.fallbackCopyText(base64);
    }
  }

  fallbackCopyText(text) {
    const ta = document.createElement('textarea');
    ta.value = text;
    document.body.appendChild(ta);
    ta.select();
    try {
      document.execCommand('copy');
      this.showToast('Kode data berhasil disalin!');
    } catch (e) {
      prompt('Salin kode ini secara manual:', text);
    }
    document.body.removeChild(ta);
  }

  applySyncCode() {
    const input = document.getElementById('sync-input-code');
    if (!input || !input.value.trim()) {
      this.showToast('Harap tempelkan kode sinkronisasi terlebih dahulu!', 'error');
      return;
    }

    try {
      const raw = input.value.trim();
      let decoded = '';
      try {
        decoded = decodeURIComponent(escape(atob(raw)));
      } catch (e) {
        decoded = raw; // Maybe raw JSON was pasted
      }

      const parsed = JSON.parse(decoded);
      if (parsed.weeksData && Array.isArray(parsed.weeksData)) {
        this.weeksData = parsed.weeksData;
        this.saveData();
      }
      if (parsed.raceEvent && typeof parsed.raceEvent === 'object') {
        this.raceEvent = parsed.raceEvent;
        this.saveEventData();
      }

      this.closeSyncModal();
      this.initCountdown();
      this.renderSummaryStats();
      this.renderCalendar();
      this.renderTrainingContent();
      this.initCharts();
      this.showToast('Sinkronisasi sukses! Data latihan telah diperbarui.');
      input.value = '';
    } catch (e) {
      console.error('Gagal menerapkan sinkronisasi:', e);
      this.showToast('Kode sinkronisasi tidak valid!', 'error');
    }
  }

  // ================= EVENT LISTENERS =================
  bindEvents() {
    // Filter buttons
    const filterButtons = document.querySelectorAll('.filter-btn');
    filterButtons.forEach(btn => {
      btn.addEventListener('click', (e) => {
        filterButtons.forEach(b => {
          b.classList.remove('bg-indigo-600', 'text-white');
          b.classList.add('bg-slate-800', 'text-slate-300');
        });
        const target = e.currentTarget;
        target.classList.add('bg-indigo-600', 'text-white');
        target.classList.remove('bg-slate-800', 'text-slate-300');
        this.currentFilter = target.dataset.filter;
        this.renderTrainingContent();
      });
    });

    // View Toggle (Card vs Excel)
    const viewButtons = document.querySelectorAll('.view-toggle-btn');
    viewButtons.forEach(btn => {
      btn.addEventListener('click', (e) => {
        viewButtons.forEach(b => {
          b.classList.remove('bg-slate-700', 'text-white');
          b.classList.add('text-slate-400');
        });
        const target = e.currentTarget;
        target.classList.add('bg-slate-700', 'text-white');
        target.classList.remove('text-slate-400');
        this.currentView = target.dataset.view;
        this.renderTrainingContent();
      });
    });

    // Auto-calculate metric listeners (Jarak, Waktu, Pace)
    const distInput = document.getElementById('field-distance');
    const timeInput = document.getElementById('field-time');
    const paceInput = document.getElementById('field-pace');

    if (distInput) {
      distInput.addEventListener('input', (e) => {
        if (e.target.value.includes(',')) {
          e.target.value = e.target.value.replace(',', '.');
        }
        this.autoCalculateMetrics('distance');
      });
    }

    if (timeInput) {
      timeInput.addEventListener('input', () => {
        this.autoCalculateMetrics('time');
      });
      timeInput.addEventListener('blur', () => {
        if (timeInput.value.trim()) {
          const parsed = this.parseAndFormatRunningTime(timeInput.value);
          if (parsed.formatted) {
            timeInput.value = parsed.formatted;
          }
        }
        this.autoCalculateMetrics('time');
      });
    }

    if (paceInput) {
      paceInput.addEventListener('input', () => {
        this.autoCalculateMetrics('pace');
      });
    }

    // Modal Workout Type Change
    const typeSelect = document.getElementById('field-type');
    if (typeSelect) {
      typeSelect.addEventListener('change', () => this.handleWorkoutTypeChange());
    }

    // Dynamic row buttons
    const btnAddSet = document.getElementById('btn-add-interval-set');
    if (btnAddSet) btnAddSet.addEventListener('click', () => this.addIntervalSetRow());

    const btnAddSegment = document.getElementById('btn-add-tempo-segment');
    if (btnAddSegment) btnAddSegment.addEventListener('click', () => this.addTempoSegmentRow());

    // Event form listener
    const formEvent = document.getElementById('form-event');
    if (formEvent) formEvent.addEventListener('submit', (e) => this.handleSaveEvent(e));
  }

  handleWorkoutTypeChange() {
    const type = document.getElementById('field-type').value;
    const intervalSection = document.getElementById('section-interval-details');
    const tempoSection = document.getElementById('section-tempo-details');

    if (type === 'interval_run') {
      intervalSection.classList.remove('hidden');
      tempoSection.classList.add('hidden');
    } else if (type === 'tempo_run') {
      tempoSection.classList.remove('hidden');
      intervalSection.classList.add('hidden');
    } else {
      intervalSection.classList.add('hidden');
      tempoSection.classList.add('hidden');
    }
  }

  // ================= MODAL OPERATIONS =================
  openAddSessionModal() {
    this.editingSession = null;
    document.getElementById('modal-session-title').textContent = 'Catat Sesi Lari Baru';
    document.getElementById('form-session').reset();

    const timePreview = document.getElementById('time-preview-badge');
    if (timePreview) timePreview.classList.add('hidden');

    // Hide delete button when adding new session
    const delBtn = document.getElementById('btn-modal-delete');
    if (delBtn) delBtn.classList.add('hidden');

    const today = new Date().toISOString().split('T')[0];
    document.getElementById('field-date').value = today;

    document.getElementById('interval-sets-table-body').innerHTML = '';
    document.getElementById('tempo-segments-table-body').innerHTML = '';

    this.addIntervalSetRow(1, '400m', '01:56', "4'50\"", 170);
    this.addIntervalSetRow(2, '400m', '01:54', "4'45\"", 175);
    this.addIntervalSetRow(3, '400m', '01:52', "4'40\"", 180);

    this.addTempoSegmentRow('Warm Up', 2.0, '15:00', "7'30\"", 145);
    this.addTempoSegmentRow('Tempo Core', 4.0, '23:00', "5'45\"", 165);
    this.addTempoSegmentRow('Cool Down', 1.5, '12:00', "8'00\"", 150);

    this.handleWorkoutTypeChange();
    this.updateWeekSelectorInModal();
    document.getElementById('modal-session').classList.remove('hidden');
  }

  closeModal() {
    document.getElementById('modal-session').classList.add('hidden');
  }

  updateWeekSelectorInModal() {
    const selector = document.getElementById('field-week-select');
    if (!selector) return;
    selector.innerHTML = this.weeksData.map(w => `
      <option value="${w.id}">${w.title} (${w.sessions.length} Sesi)</option>
    `).join('');
  }

  addIntervalSetRow(num, target = '400m', time = '', pace = "4'45\"", hr = 175) {
    const tbody = document.getElementById('interval-sets-table-body');
    const setNum = num || (tbody.children.length + 1);

    const tr = document.createElement('tr');
    tr.className = 'border-b border-slate-800 text-xs';
    tr.innerHTML = `
      <td class="py-1 px-1 text-slate-400 font-bold set-number-cell">${setNum}</td>
      <td class="py-1 px-1"><input type="text" value="${target}" class="w-full bg-slate-900 border border-slate-700 rounded px-1.5 py-1 text-slate-200 set-target" placeholder="400m / 02:00"></td>
      <td class="py-1 px-1"><input type="text" value="${time || ''}" class="w-full bg-slate-900 border border-slate-700 rounded px-1.5 py-1 text-amber-300 font-mono-numbers set-time" placeholder="01:54"></td>
      <td class="py-1 px-1"><input type="text" value="${pace}" class="w-full bg-slate-900 border border-slate-700 rounded px-1.5 py-1 text-rose-300 font-mono-numbers set-pace" placeholder="4'30\\\""></td>
      <td class="py-1 px-1"><input type="number" value="${hr || ''}" class="w-full bg-slate-900 border border-slate-700 rounded px-1.5 py-1 text-slate-300 font-mono-numbers set-hr" placeholder="175"></td>
      <td class="py-1 px-1 text-center">
        <button type="button" onclick="this.closest('tr').remove(); window.app.renumberIntervalSets();" class="text-rose-400 hover:text-rose-300">
          <i data-lucide="x" class="w-3.5 h-3.5"></i>
        </button>
      </td>
    `;
    tbody.appendChild(tr);
    if (window.lucide) window.lucide.createIcons();
  }

  renumberIntervalSets() {
    const cells = document.querySelectorAll('.set-number-cell');
    cells.forEach((cell, idx) => { cell.textContent = idx + 1; });
  }

  addTempoSegmentRow(name = 'Tempo Core', dist = 3.0, time = '18:00', pace = "6'00\"", hr = 165) {
    const tbody = document.getElementById('tempo-segments-table-body');
    const tr = document.createElement('tr');
    tr.className = 'border-b border-slate-800 text-xs';
    tr.innerHTML = `
      <td class="py-1 px-1"><input type="text" value="${name}" class="w-full bg-slate-900 border border-slate-700 rounded px-1.5 py-1 text-slate-200 seg-name" placeholder="Nama Segmen"></td>
      <td class="py-1 px-1"><input type="text" inputmode="decimal" value="${dist}" class="w-full bg-slate-900 border border-slate-700 rounded px-1.5 py-1 text-slate-200 seg-dist" placeholder="km"></td>
      <td class="py-1 px-1"><input type="text" value="${time}" class="w-full bg-slate-900 border border-slate-700 rounded px-1.5 py-1 text-slate-200 seg-time" placeholder="Waktu"></td>
      <td class="py-1 px-1"><input type="text" value="${pace}" class="w-full bg-slate-900 border border-slate-700 rounded px-1.5 py-1 text-slate-200 seg-pace" placeholder="Pace"></td>
      <td class="py-1 px-1"><input type="number" value="${hr || ''}" class="w-full bg-slate-900 border border-slate-700 rounded px-1.5 py-1 text-slate-200 seg-hr" placeholder="HR"></td>
      <td class="py-1 px-1 text-center">
        <button type="button" onclick="this.closest('tr').remove();" class="text-rose-400 hover:text-rose-300">
          <i data-lucide="x" class="w-3.5 h-3.5"></i>
        </button>
      </td>
    `;
    tbody.appendChild(tr);
    if (window.lucide) window.lucide.createIcons();
  }

  handleSaveSession(e) {
    if (e && e.preventDefault) e.preventDefault();

    const weekId = document.getElementById('field-week-select').value;
    const type = document.getElementById('field-type').value;
    const date = document.getElementById('field-date').value;
    
    // Konversi koma ke titik untuk jarak (aman dari input HP)
    const rawDist = (document.getElementById('field-distance').value || '').replace(',', '.').trim();
    const distance = parseFloat(rawDist) || 0;
    
    const rawTime = document.getElementById('field-time').value.trim();
    const parsedTime = this.parseAndFormatRunningTime(rawTime);
    const time = parsedTime.formatted || rawTime;
    const timeMinutes = parsedTime.minutes || this.timeToMinutes(rawTime);

    let pace = document.getElementById('field-pace').value.trim();
    // Jika pace kosong, hitung otomatis dari waktu & jarak
    if (!pace && distance > 0 && parsedTime.totalSeconds > 0) {
      pace = this.secondsToPace(Math.round(parsedTime.totalSeconds / distance));
    }

    const hr = parseInt(document.getElementById('field-hr').value, 10) || null;
    const location = document.getElementById('field-location').value;
    const notes = document.getElementById('field-notes').value.trim();

    const dayNames = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
    const d = new Date(date + 'T00:00:00');
    const dayName = isNaN(d.getTime()) ? date : `${dayNames[d.getDay()]}, ${d.getDate().toString().padStart(2, '0')}/${(d.getMonth() + 1).toString().padStart(2, '0')}/${d.getFullYear()}`;

    let categoryTitle = 'Easy Run';
    if (type === 'tempo_run') categoryTitle = 'Tempo Run';
    if (type === 'interval_run') categoryTitle = 'Interval Run';
    if (type === 'long_run') categoryTitle = 'Long Run';

    const sessionObj = {
      id: this.editingSession ? this.editingSession.sessionId : 's_' + Date.now(),
      date,
      dayName,
      type,
      categoryTitle,
      distance,
      time,
      timeMinutes,
      pace,
      hr,
      location,
      notes
    };

    if (type === 'interval_run') {
      const rows = document.querySelectorAll('#interval-sets-table-body tr');
      const sets = [];
      rows.forEach((r, idx) => {
        sets.push({
          setNumber: idx + 1,
          target: r.querySelector('.set-target') ? r.querySelector('.set-target').value.trim() : '',
          time: r.querySelector('.set-time') ? r.querySelector('.set-time').value.trim() : '',
          pace: r.querySelector('.set-pace') ? r.querySelector('.set-pace').value.trim() : '',
          hr: parseInt(r.querySelector('.set-hr').value, 10) || null
        });
      });
      sessionObj.sets = sets;
      sessionObj.setsTitle = `Interval (${sets.length > 0 ? sets[0].target : '400m'} x ${sets.length})`;

      const wuDist = parseFloat((document.getElementById('field-interval-wu-dist').value || '').replace(',', '.')) || 0;
      sessionObj.warmup = {
        name: 'Warm Up',
        distance: wuDist,
        pace: document.getElementById('field-interval-wu-pace').value.trim(),
        hr: parseInt(document.getElementById('field-interval-wu-hr').value, 10) || null
      };

      const cdDist = parseFloat((document.getElementById('field-interval-cd-dist').value || '').replace(',', '.')) || 0;
      sessionObj.cooldown = {
        name: 'Cool Down',
        distance: cdDist,
        pace: document.getElementById('field-interval-cd-pace').value.trim(),
        hr: parseInt(document.getElementById('field-interval-cd-hr').value, 10) || null
      };
    }

    if (type === 'tempo_run') {
      const rows = document.querySelectorAll('#tempo-segments-table-body tr');
      const segments = [];
      rows.forEach(r => {
        const segDist = parseFloat((r.querySelector('.seg-dist').value || '').replace(',', '.')) || 0;
        segments.push({
          name: r.querySelector('.seg-name').value.trim(),
          distance: segDist,
          time: r.querySelector('.seg-time').value.trim(),
          pace: r.querySelector('.seg-pace').value.trim(),
          hr: parseInt(r.querySelector('.seg-hr').value, 10) || null
        });
      });
      sessionObj.segments = segments;
    }

    const targetWeek = this.weeksData.find(w => String(w.id) === String(weekId));
    if (!targetWeek) {
      this.showToast('Minggu latihan tidak ditemukan!', 'error');
      return false;
    }

    if (this.editingSession) {
      const origWeekId = String(this.editingSession.weekId);
      const origSessionId = String(this.editingSession.sessionId);

      // Jika user memindahkan sesi ke minggu lain di modal
      if (origWeekId !== String(weekId)) {
        const origWeek = this.weeksData.find(w => String(w.id) === origWeekId);
        if (origWeek) {
          origWeek.sessions = origWeek.sessions.filter(s => String(s.id) !== origSessionId);
        }
      }

      const idx = targetWeek.sessions.findIndex(s => String(s.id) === origSessionId);
      if (idx !== -1) {
        targetWeek.sessions[idx] = sessionObj;
      } else {
        targetWeek.sessions.push(sessionObj);
      }
    } else {
      targetWeek.sessions.push(sessionObj);
    }

    this.saveData();
    this.closeModal();
    this.renderSummaryStats();
    this.renderCalendar();
    this.renderTrainingContent();
    this.initCharts();
    this.showToast('Sesi lari berhasil disimpan!');
    return false;
  }

  editSession(weekId, sessionId) {
    const week = this.weeksData.find(w => String(w.id) === String(weekId));
    if (!week) return;
    const session = week.sessions.find(s => String(s.id) === String(sessionId));
    if (!session) return;

    this.editingSession = { weekId, sessionId };
    document.getElementById('modal-session-title').textContent = 'Edit Sesi Lari';
    document.getElementById('field-week-select').value = weekId;
    document.getElementById('field-type').value = session.type;
    document.getElementById('field-date').value = session.date || '';
    document.getElementById('field-distance').value = session.distance || '';
    document.getElementById('field-time').value = session.time || '';
    document.getElementById('field-pace').value = session.pace || '';
    document.getElementById('field-hr').value = session.hr || '';
    document.getElementById('field-location').value = session.location || 'Outdoor';
    document.getElementById('field-notes').value = session.notes || '';

    // Tampilkan preview waktu
    if (session.time) {
      const parsed = this.parseAndFormatRunningTime(session.time);
      const badgeEl = document.getElementById('time-preview-badge');
      if (badgeEl && parsed.preview) {
        badgeEl.textContent = `⏱️ ${parsed.preview}`;
        badgeEl.classList.remove('hidden');
      }
    }

    this.handleWorkoutTypeChange();

    const intervalTbody = document.getElementById('interval-sets-table-body');
    intervalTbody.innerHTML = '';
    if (session.type === 'interval_run' && session.sets) {
      session.sets.forEach(st => {
        this.addIntervalSetRow(st.setNumber, st.target, st.time || '', st.pace, st.hr);
      });
      if (session.warmup) {
        document.getElementById('field-interval-wu-dist').value = session.warmup.distance || 1.5;
        document.getElementById('field-interval-wu-pace').value = session.warmup.pace || "8'17\"";
        document.getElementById('field-interval-wu-hr').value = session.warmup.hr || 151;
      }
      if (session.cooldown) {
        document.getElementById('field-interval-cd-dist').value = session.cooldown.distance || 1.64;
        document.getElementById('field-interval-cd-pace').value = session.cooldown.pace || "9'08\"";
        document.getElementById('field-interval-cd-hr').value = session.cooldown.hr || 165;
      }
    }

    const tempoTbody = document.getElementById('tempo-segments-table-body');
    tempoTbody.innerHTML = '';
    if (session.type === 'tempo_run' && session.segments) {
      session.segments.forEach(seg => {
        this.addTempoSegmentRow(seg.name, seg.distance, seg.time, seg.pace, seg.hr);
      });
    }

    // Show delete button when editing existing session
    const delBtn = document.getElementById('btn-modal-delete');
    if (delBtn) delBtn.classList.remove('hidden');

    document.getElementById('modal-session').classList.remove('hidden');
  }

  deleteCurrentEditingSession() {
    if (!this.editingSession) return;
    const { weekId, sessionId } = this.editingSession;
    this.closeModal();
    this.deleteSession(weekId, sessionId);
  }

  deleteSession(weekId, sessionId) {
    if (!confirm('Yakin ingin menghapus sesi latihan ini?')) return;
    const week = this.weeksData.find(w => String(w.id) === String(weekId));
    if (!week) {
      console.warn('Minggu tidak ditemukan:', weekId);
      return;
    }
    const prevCount = week.sessions.length;
    week.sessions = week.sessions.filter(s => String(s.id) !== String(sessionId));

    this.saveData();
    this.renderSummaryStats();
    this.renderCalendar();
    this.renderTrainingContent();
    try {
      this.initCharts();
    } catch (err) {
      console.warn('Chart render error:', err);
    }
    this.showToast('Sesi latihan telah dihapus.');
  }

  addNewWeek() {
    const nextWeekNum = this.weeksData.length + 1;
    const weekTitle = prompt(`Masukkan nama minggu baru:`, `WEEK ${nextWeekNum}`);
    if (!weekTitle) return;

    const newWeek = {
      id: `week-${nextWeekNum}-${Date.now()}`,
      weekNumber: nextWeekNum,
      title: weekTitle.toUpperCase(),
      notes: "Rencana program latihan baru",
      sessions: []
    };

    this.weeksData.push(newWeek);
    this.saveData();
    this.renderTrainingContent();
    this.updateWeekSelectorInModal();
    this.showToast(`Minggu baru "${newWeek.title}" berhasil ditambahkan!`);
  }

  deleteWeek(weekId) {
    if (!confirm('Yakin ingin menghapus seluruh minggu ini beserta semua sesinya?')) return;
    this.weeksData = this.weeksData.filter(w => w.id !== weekId);
    this.saveData();
    this.renderSummaryStats();
    this.renderCalendar();
    this.renderTrainingContent();
    this.initCharts();
    this.updateWeekSelectorInModal();
    this.showToast('Minggu latihan telah dihapus.');
  }

  resetToExcelDefaults() {
    if (!confirm('Apakah Anda yakin ingin mengembalikan seluruh data ke data asli dari Excel VHM SUB 2.xlsx? Data custom saat ini akan ditimpa.')) {
      return;
    }
    this.weeksData = JSON.parse(JSON.stringify(this.initialData));
    this.saveData();
    this.renderSummaryStats();
    this.renderCalendar();
    this.renderTrainingContent();
    this.initCharts();
    this.updateWeekSelectorInModal();
    this.showToast('Data berhasil di-reset sesuai file Excel VHM SUB 2!');
  }

  exportJSON() {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(this.weeksData, null, 2));
    const dlAnchor = document.createElement('a');
    dlAnchor.setAttribute("href", dataStr);
    dlAnchor.setAttribute("download", `VHM_SUB_2_backup_${new Date().toISOString().split('T')[0]}.json`);
    dlAnchor.click();
    this.showToast('File backup JSON berhasil diunduh.');
  }

  exportToCSV() {
    let csv = "Week,Session Date,Type,Distance (km),Time,Pace,Heart Rate,Location,Notes\n";
    this.weeksData.forEach(w => {
      w.sessions.forEach(s => {
        csv += `"${w.title}","${s.dayName || s.date}","${s.categoryTitle}","${s.distance || ''}","${s.time || ''}","${s.pace || ''}","${s.hr || ''}","${s.location || ''}","${(s.notes || '').replace(/"/g, '""')}"\n`;
      });
    });

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `VHM_SUB_2_export_${new Date().toISOString().split('T')[0]}.csv`);
    link.click();
    this.showToast('File CSV berhasil diekspor.');
  }

  importJSON(event) {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const imported = JSON.parse(e.target.result);
        if (Array.isArray(imported)) {
          this.weeksData = imported;
          this.saveData();
          this.renderSummaryStats();
          this.renderCalendar();
          this.renderTrainingContent();
          this.initCharts();
          this.updateWeekSelectorInModal();
          this.showToast('Data latihan berhasil diimpor!');
        } else {
          throw new Error('Format data tidak sesuai.');
        }
      } catch (err) {
        alert('Gagal mengimpor file: ' + err.message);
      }
    };
    reader.readAsText(file);
  }

  importExcel(event) {
    const file = event.target.files[0];
    if (!file) return;

    if (!window.XLSX) {
      alert('Library SheetJS belum dimuat.');
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target.result);
        const workbook = window.XLSX.read(data, { type: 'array' });
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];
        const sheetData = window.XLSX.utils.sheet_to_json(worksheet, { header: 1 });
        this.parseExcelMatrix(sheetData);
      } catch (err) {
        console.error('Gagal membaca file Excel:', err);
        alert('Gagal membaca file Excel: ' + err.message);
      }
    };
    reader.readAsArrayBuffer(file);
  }

  parseExcelMatrix(matrix) {
    let weekRowIdx = -1;
    for (let r = 0; r < matrix.length; r++) {
      const row = matrix[r] || [];
      if (row.some(c => typeof c === 'string' && c.toUpperCase().includes('WEEK 1'))) {
        weekRowIdx = r;
        break;
      }
    }

    if (weekRowIdx === -1) {
      this.showToast('Format Excel tidak sesuai struktur VHM SUB 2', 'error');
      return;
    }

    const weekRow = matrix[weekRowIdx];
    const parsedWeeks = [];
    let currentWeek = null;

    for (let c = 0; c < weekRow.length; c++) {
      const cellVal = weekRow[c];
      if (cellVal && typeof cellVal === 'string' && cellVal.toUpperCase().startsWith('WEEK')) {
        const wTitle = cellVal.trim().toUpperCase();
        currentWeek = {
          id: 'week-' + (parsedWeeks.length + 1) + '-' + Date.now(),
          weekNumber: parsedWeeks.length + 1,
          title: wTitle,
          notes: 'Diimpor dari file Excel ' + wTitle,
          sessions: [],
          startCol: c
        };
        parsedWeeks.push(currentWeek);
      }
    }

    if (parsedWeeks.length === 0) {
      this.showToast('Tidak ada data minggu yang ditemukan dalam Excel', 'error');
      return;
    }

    const dateRow = matrix[weekRowIdx + 2] || [];
    const typeRow = matrix[weekRowIdx + 3] || [];
    const distRow = matrix[weekRowIdx + 4] || [];
    const timeRow = matrix[weekRowIdx + 5] || [];
    const paceRow = matrix[weekRowIdx + 6] || [];
    const hrRow = matrix[weekRowIdx + 7] || [];
    const locRow = matrix[weekRowIdx + 8] || [];

    parsedWeeks.forEach((pw, pIdx) => {
      const nextCol = (pIdx < parsedWeeks.length - 1) ? parsedWeeks[pIdx + 1].startCol : 60;
      for (let col = pw.startCol; col < nextCol; col++) {
        const rawType = typeRow[col];
        if (rawType && typeof rawType === 'string') {
          const typeLower = rawType.toLowerCase();
          let sType = 'easy_run';
          if (typeLower.includes('tempo')) sType = 'tempo_run';
          else if (typeLower.includes('interval')) sType = 'interval_run';
          else if (typeLower.includes('long')) sType = 'long_run';

          const sDate = dateRow[col] || `Sesi ${pw.sessions.length + 1}`;
          let sDist = parseFloat(distRow[col + 1]) || parseFloat(distRow[col]) || 0;
          let sTime = timeRow[col + 1] || timeRow[col] || '';
          if (typeof sTime === 'number' && sTime < 1) {
            const totalSec = Math.round(sTime * 86400);
            const hrs = Math.floor(totalSec / 3600);
            const mins = Math.floor((totalSec % 3600) / 60);
            const secs = totalSec % 60;
            sTime = hrs > 0 ? `${hrs}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}` : `${mins}:${secs.toString().padStart(2, '0')}`;
          }
          const sPace = paceRow[col + 1] || paceRow[col] || '';
          const sHr = parseInt(hrRow[col + 1] || hrRow[col], 10) || null;
          const sLoc = locRow[col] || (sType === 'easy_run' ? 'Indoor' : 'Outdoor');

          pw.sessions.push({
            id: 's_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
            date: sDate,
            dayName: sDate,
            type: sType,
            categoryTitle: rawType,
            distance: sDist,
            time: sTime.toString(),
            timeMinutes: this.timeToMinutes(sTime),
            pace: sPace.toString(),
            hr: sHr,
            location: sLoc.toString(),
            notes: 'Diimpor dari Excel'
          });
        }
      }
      delete pw.startCol;
    });

    this.weeksData = parsedWeeks;
    this.saveData();
    this.renderSummaryStats();
    this.renderCalendar();
    this.renderTrainingContent();
    this.initCharts();
    this.updateWeekSelectorInModal();
    this.showToast('Data dari file Excel berhasil diimpor!');
  }

  showToast(message, type = 'success') {
    const toast = document.getElementById('toast');
    if (!toast) return;

    toast.textContent = message;
    toast.className = `fixed bottom-20 md:bottom-6 right-6 z-50 px-4 py-2.5 rounded-xl shadow-2xl text-xs font-semibold flex items-center gap-2 transition-all transform duration-300 ${
      type === 'error' ? 'bg-rose-600 text-white' : 'bg-emerald-600 text-white'
    }`;
    toast.classList.remove('translate-y-20', 'opacity-0');

    setTimeout(() => {
      toast.classList.add('translate-y-20', 'opacity-0');
    }, 3200);
  }
}

// Global initialization that works whether DOMContentLoaded has fired or not
function initRunningApp() {
  if (!window.app) {
    window.app = new RunningTrackerApp();
  }
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initRunningApp);
} else {
  initRunningApp();
}
