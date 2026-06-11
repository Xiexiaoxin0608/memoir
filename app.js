(() => {
    const $ = (s) => document.querySelector(s);
    const $$ = (s) => document.querySelectorAll(s);

    // ========== Particles ==========
    const particlesEl = $('#particles');
    for (let i = 0; i < 30; i++) {
        const p = document.createElement('div');
        p.className = 'particle';
        p.style.left = Math.random() * 100 + '%';
        p.style.animationDuration = (8 + Math.random() * 12) + 's';
        p.style.animationDelay = Math.random() * 10 + 's';
        p.style.width = p.style.height = (2 + Math.random() * 4) + 'px';
        particlesEl.appendChild(p);
    }

    // ========== Navbar scroll ==========
    const navbar = $('#navbar');
    window.addEventListener('scroll', () => {
        navbar.classList.toggle('scrolled', window.scrollY > 50);
    });

    // ========== Toast ==========
    function showToast(msg) {
        const t = $('#toast');
        t.textContent = msg;
        t.classList.add('show');
        setTimeout(() => t.classList.remove('show'), 2500);
    }

    // ========== Data store ==========
    const STORE_KEY = 'memoir_data';
    let data = JSON.parse(localStorage.getItem(STORE_KEY) || 'null') || {
        timeline: [],
        gallery: [],
        moments: []
    };
    function save() { localStorage.setItem(STORE_KEY, JSON.stringify(data)); }

    // ========== Timeline ==========
    const timelineContainer = $('#timeline-container');
    const addMomentBtn = $('#add-moment-btn');

    function renderTimeline() {
        timelineContainer.innerHTML = '<div class="timeline-line"></div>';
        data.timeline.sort((a, b) => new Date(b.date) - new Date(a.date));

        data.timeline.forEach((item, i) => {
            const div = document.createElement('div');
            div.className = 'timeline-item';
            div.style.animationDelay = (i * 0.1) + 's';
            div.innerHTML = `
                <div class="timeline-dot"></div>
                <div class="timeline-card" style="position:relative">
                    <button class="delete-btn" data-id="${item.id}">&times;</button>
                    ${item.image ? `<img src="${item.image}" alt="${item.title}">` : ''}
                    <div class="timeline-date">${item.date}</div>
                    <h3>${item.title}</h3>
                    <p>${item.description}</p>
                </div>
            `;
            timelineContainer.appendChild(div);
        });

        timelineContainer.querySelectorAll('.delete-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                data.timeline = data.timeline.filter(t => t.id !== btn.dataset.id);
                save();
                renderTimeline();
                showToast('已删除');
            });
        });
    }

    // Timeline modal
    let timelineModalOverlay;
    function createTimelineModal() {
        timelineModalOverlay = document.createElement('div');
        timelineModalOverlay.className = 'timeline-modal-overlay';
        timelineModalOverlay.innerHTML = `
            <div class="timeline-modal">
                <h3>添加新时刻</h3>
                <div class="form-group">
                    <label>标题</label>
                    <input type="text" id="tl-title" placeholder="给这一刻取个名字">
                </div>
                <div class="form-group">
                    <label>日期</label>
                    <input type="date" id="tl-date">
                </div>
                <div class="form-group">
                    <label>描述</label>
                    <textarea id="tl-desc" placeholder="记录这个特别的时刻..."></textarea>
                </div>
                <div class="form-group">
                    <label>配图（可选）</label>
                    <div class="form-image-upload" id="tl-upload-trigger">点击选择图片</div>
                    <img class="form-image-preview" id="tl-image-preview">
                    <input type="file" id="tl-file-input" accept="image/*" hidden>
                </div>
                <div class="form-buttons">
                    <button class="btn-secondary" id="tl-cancel">取消</button>
                    <button class="btn-primary" id="tl-save">保存</button>
                </div>
            </div>
        `;
        document.body.appendChild(timelineModalOverlay);

        const trigger = timelineModalOverlay.querySelector('#tl-upload-trigger');
        const fileInput = timelineModalOverlay.querySelector('#tl-file-input');
        const preview = timelineModalOverlay.querySelector('#tl-image-preview');
        let tlImage = null;

        trigger.addEventListener('click', () => fileInput.click());
        fileInput.addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (!file) return;
            const reader = new FileReader();
            reader.onload = (ev) => {
                tlImage = ev.target.result;
                preview.src = tlImage;
                preview.style.display = 'block';
                trigger.style.display = 'none';
            };
            reader.readAsDataURL(file);
        });

        timelineModalOverlay.querySelector('#tl-cancel').addEventListener('click', () => {
            timelineModalOverlay.classList.remove('active');
        });

        timelineModalOverlay.querySelector('#tl-save').addEventListener('click', () => {
            const title = timelineModalOverlay.querySelector('#tl-title').value.trim();
            const date = timelineModalOverlay.querySelector('#tl-date').value;
            const desc = timelineModalOverlay.querySelector('#tl-desc').value.trim();
            if (!title || !date) { showToast('请填写标题和日期'); return; }

            data.timeline.push({
                id: Date.now().toString(),
                title,
                date,
                description: desc,
                image: tlImage
            });
            save();
            renderTimeline();
            timelineModalOverlay.classList.remove('active');
            showToast('时刻已添加');
        });

        timelineModalOverlay.addEventListener('click', (e) => {
            if (e.target === timelineModalOverlay) timelineModalOverlay.classList.remove('active');
        });
    }

    addMomentBtn.addEventListener('click', () => {
        if (!timelineModalOverlay) createTimelineModal();
        timelineModalOverlay.querySelector('#tl-title').value = '';
        timelineModalOverlay.querySelector('#tl-date').value = new Date().toISOString().slice(0, 10);
        timelineModalOverlay.querySelector('#tl-desc').value = '';
        timelineModalOverlay.querySelector('#tl-image-preview').style.display = 'none';
        timelineModalOverlay.querySelector('#tl-upload-trigger').style.display = '';
        timelineModalOverlay.querySelector('#tl-file-input').value = '';
        timelineModalOverlay.classList.add('active');
    });

    // ========== Gallery ==========
    const galleryGrid = $('#gallery-grid');
    const uploadZone = $('#upload-zone');
    const galleryFileInput = $('#gallery-file-input');
    const modalOverlay = $('#modal-overlay');
    const modalImage = $('#modal-image');
    const modalInfo = $('#modal-info');
    const modalClose = $('#modal-close');

    uploadZone.addEventListener('click', () => galleryFileInput.click());

    uploadZone.addEventListener('dragover', (e) => {
        e.preventDefault();
        uploadZone.style.borderColor = 'var(--primary)';
        uploadZone.style.background = 'rgba(139,111,71,0.05)';
    });

    uploadZone.addEventListener('dragleave', () => {
        uploadZone.style.borderColor = '';
        uploadZone.style.background = '';
    });

    uploadZone.addEventListener('drop', (e) => {
        e.preventDefault();
        uploadZone.style.borderColor = '';
        uploadZone.style.background = '';
        handleFiles(e.dataTransfer.files);
    });

    galleryFileInput.addEventListener('change', (e) => handleFiles(e.target.files));

    function handleFiles(files) {
        [...files].forEach(file => {
            if (!file.type.startsWith('image/')) return;
            const reader = new FileReader();
            reader.onload = (ev) => {
                const id = Date.now().toString() + Math.random().toString(36).slice(2, 6);
                data.gallery.push({
                    id,
                    src: ev.target.result,
                    name: file.name.replace(/\.[^.]+$/, ''),
                    category: 'daily',
                    date: new Date().toLocaleDateString('zh-CN')
                });
                save();
                renderGallery();
                showToast('照片已添加');
            };
            reader.readAsDataURL(file);
        });
    }

    let currentFilter = 'all';
    function renderGallery() {
        galleryGrid.innerHTML = '';
        const filtered = currentFilter === 'all'
            ? data.gallery
            : data.gallery.filter(g => g.category === currentFilter);

        filtered.forEach((item, i) => {
            const div = document.createElement('div');
            div.className = 'gallery-item';
            div.style.animationDelay = (i * 0.05) + 's';
            div.innerHTML = `
                <img src="${item.src}" alt="${item.name}">
                <button class="delete-btn" data-id="${item.id}">&times;</button>
                <div class="gallery-item-overlay">
                    <h4>${item.name}</h4>
                    <span>${item.date}</span>
                </div>
            `;
            div.querySelector('img').addEventListener('click', () => openModal(item.src, item.name));
            div.querySelector('.delete-btn').addEventListener('click', (e) => {
                e.stopPropagation();
                data.gallery = data.gallery.filter(g => g.id !== item.id);
                save();
                renderGallery();
                showToast('照片已删除');
            });
            galleryGrid.appendChild(div);
        });

        // Re-add upload zone
        const uz = document.createElement('div');
        uz.className = 'upload-zone';
        uz.id = 'upload-zone';
        uz.innerHTML = `
            <div class="upload-content">
                <div class="upload-icon">
                    <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                        <polyline points="17 8 12 3 7 8"/>
                        <line x1="12" y1="3" x2="12" y2="15"/>
                    </svg>
                </div>
                <p>点击或拖拽上传照片</p>
                <span>支持 JPG、PNG、WebP 格式</span>
            </div>
            <input type="file" id="file-input" multiple accept="image/*" hidden>
        `;
        galleryGrid.appendChild(uz);

        // Rebind upload zone events
        const newUz = $('#upload-zone');
        const newInput = $('#file-input') || galleryFileInput;
        newUz.addEventListener('click', () => newInput.click());
        newUz.addEventListener('dragover', (e) => {
            e.preventDefault();
            newUz.style.borderColor = 'var(--primary)';
        });
        newUz.addEventListener('dragleave', () => { newUz.style.borderColor = ''; });
        newUz.addEventListener('drop', (e) => {
            e.preventDefault();
            newUz.style.borderColor = '';
            handleFiles(e.dataTransfer.files);
        });
        newInput.addEventListener('change', (e) => handleFiles(e.target.files));
    }

    function openModal(src, info) {
        modalImage.src = src;
        modalInfo.textContent = info || '';
        modalOverlay.classList.add('active');
    }

    modalClose.addEventListener('click', () => modalOverlay.classList.remove('active'));
    modalOverlay.addEventListener('click', (e) => {
        if (e.target === modalOverlay) modalOverlay.classList.remove('active');
    });

    // Filter
    $$('.filter-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            $$('.filter-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            currentFilter = btn.dataset.filter;
            renderGallery();
        });
    });

    // ========== Moments ==========
    const momentText = $('#moment-text');
    const momentSubmit = $('#moment-submit');
    const momentUploadTrigger = $('#moment-upload-trigger');
    const momentFileInput = $('#moment-file-input');
    const momentsFeed = $('#moments-feed');
    let momentImage = null;

    momentUploadTrigger.addEventListener('click', () => momentFileInput.click());
    momentFileInput.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (ev) => {
            momentImage = ev.target.result;
            showToast('图片已选择');
        };
        reader.readAsDataURL(file);
    });

    momentSubmit.addEventListener('click', () => {
        const text = momentText.value.trim();
        if (!text && !momentImage) { showToast('请写下你的心情'); return; }

        data.moments.unshift({
            id: Date.now().toString(),
            text,
            image: momentImage,
            time: new Date().toLocaleString('zh-CN')
        });
        save();
        renderMoments();
        momentText.value = '';
        momentImage = null;
        momentFileInput.value = '';
        showToast('心情已记录');
    });

    function renderMoments() {
        momentsFeed.innerHTML = '';
        data.moments.forEach((item, i) => {
            const card = document.createElement('div');
            card.className = 'moment-card feed-card';
            card.style.animationDelay = (i * 0.05) + 's';
            card.innerHTML = `
                <button class="moment-feed-delete" data-id="${item.id}">删除</button>
                ${item.text ? `<p class="moment-feed-text">${item.text}</p>` : ''}
                ${item.image ? `<img class="moment-feed-image" src="${item.image}" alt="心情图片">` : ''}
                <div class="moment-feed-time">${item.time}</div>
            `;
            card.querySelector('.moment-feed-delete').addEventListener('click', () => {
                data.moments = data.moments.filter(m => m.id !== item.id);
                save();
                renderMoments();
                showToast('已删除');
            });
            const img = card.querySelector('.moment-feed-image');
            if (img) img.addEventListener('click', () => openModal(item.image, item.time));
            momentsFeed.appendChild(card);
        });
    }

    // ========== Keyboard ==========
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            modalOverlay.classList.remove('active');
            if (timelineModalOverlay) timelineModalOverlay.classList.remove('active');
        }
    });

    // ========== Init ==========
    renderTimeline();
    renderGallery();
    renderMoments();

    // Set default date for timeline modal
    const dateInput = document.getElementById('tl-date');
    if (dateInput) dateInput.value = new Date().toISOString().slice(0, 10);
})();
