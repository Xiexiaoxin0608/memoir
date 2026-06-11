(() => {
    const $ = (s) => document.querySelector(s);
    const $$ = (s) => document.querySelectorAll(s);

    // ========== Supabase ==========
    const SUPABASE_URL = 'https://dvzwxifvfyuiwhrhfmnb.supabase.co';
    const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImR2end4aWZ2Znl1aXdocmhmbW5iIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODExNjU5MTMsImV4cCI6MjA5Njc0MTkxM30._8fLeeHhNjv0GAI_83Pmmekoai5pH7pzzfx5vIvU-X0';
    const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

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

    // ========== Upload image to Supabase Storage ==========
    async function uploadImage(file) {
        const ext = file.name.split('.').pop();
        const path = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
        const { data, error } = await supabase.storage.from('memoir-images').upload(path, file);
        if (error) { console.error('Upload error:', error); return null; }
        const { data: urlData } = supabase.storage.from('memoir-images').getPublicUrl(data.path);
        return urlData.publicUrl;
    }

    async function deleteImage(url) {
        const path = url.split('/memoir-images/')[1];
        if (path) await supabase.storage.from('memoir-images').remove([path]);
    }

    // ========== Data ==========
    let timelineData = [];
    let galleryData = [];
    let momentsData = [];

    async function loadAll() {
        const [tl, gl, ml] = await Promise.all([
            supabase.from('timeline').select('*').order('date', { ascending: false }),
            supabase.from('gallery').select('*').order('created_at', { ascending: false }),
            supabase.from('moments').select('*').order('created_at', { ascending: false })
        ]);
        timelineData = tl.data || [];
        galleryData = gl.data || [];
        momentsData = ml.data || [];
        renderTimeline();
        renderGallery();
        renderMoments();
    }

    // ========== Timeline ==========
    const timelineContainer = $('#timeline-container');
    const addMomentBtn = $('#add-moment-btn');

    function renderTimeline() {
        timelineContainer.innerHTML = '<div class="timeline-line"></div>';
        timelineData.sort((a, b) => new Date(b.date) - new Date(a.date));

        timelineData.forEach((item, i) => {
            const div = document.createElement('div');
            div.className = 'timeline-item';
            div.style.animationDelay = (i * 0.1) + 's';
            div.innerHTML = `
                <div class="timeline-dot"></div>
                <div class="timeline-card" style="position:relative">
                    <button class="delete-btn" data-id="${item.id}">&times;</button>
                    ${item.image_url ? `<img src="${item.image_url}" alt="${item.title}">` : ''}
                    <div class="timeline-date">${item.date}</div>
                    <h3>${item.title}</h3>
                    <p>${item.description}</p>
                </div>
            `;
            timelineContainer.appendChild(div);
        });

        timelineContainer.querySelectorAll('.delete-btn').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                e.stopPropagation();
                const id = btn.dataset.id;
                const item = timelineData.find(t => t.id === id);
                if (item?.image_url) await deleteImage(item.image_url);
                await supabase.from('timeline').delete().eq('id', id);
                timelineData = timelineData.filter(t => t.id !== id);
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
        let tlFile = null;

        trigger.addEventListener('click', () => fileInput.click());
        fileInput.addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (!file) return;
            tlFile = file;
            const reader = new FileReader();
            reader.onload = (ev) => {
                preview.src = ev.target.result;
                preview.style.display = 'block';
                trigger.style.display = 'none';
            };
            reader.readAsDataURL(file);
        });

        timelineModalOverlay.querySelector('#tl-cancel').addEventListener('click', () => {
            timelineModalOverlay.classList.remove('active');
        });

        timelineModalOverlay.querySelector('#tl-save').addEventListener('click', async () => {
            const title = timelineModalOverlay.querySelector('#tl-title').value.trim();
            const date = timelineModalOverlay.querySelector('#tl-date').value;
            const desc = timelineModalOverlay.querySelector('#tl-desc').value.trim();
            if (!title || !date) { showToast('请填写标题和日期'); return; }

            const saveBtn = timelineModalOverlay.querySelector('#tl-save');
            saveBtn.textContent = '保存中...';
            saveBtn.disabled = true;

            let imageUrl = '';
            if (tlFile) imageUrl = await uploadImage(tlFile) || '';

            const id = Date.now().toString();
            await supabase.from('timeline').insert({ id, title, date, description: desc, image_url: imageUrl });
            timelineData.unshift({ id, title, date, description: desc, image_url: imageUrl });

            saveBtn.textContent = '保存';
            saveBtn.disabled = false;
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

    function bindUploadZone() {
        const uz = $('#upload-zone');
        const fi = $('#file-input') || galleryFileInput;
        uz.addEventListener('click', () => fi.click());
        uz.addEventListener('dragover', (e) => { e.preventDefault(); uz.style.borderColor = 'var(--primary)'; });
        uz.addEventListener('dragleave', () => { uz.style.borderColor = ''; });
        uz.addEventListener('drop', (e) => { e.preventDefault(); uz.style.borderColor = ''; handleFiles(e.dataTransfer.files); });
        fi.addEventListener('change', (e) => handleFiles(e.target.files));
    }

    bindUploadZone();

    async function handleFiles(files) {
        for (const file of files) {
            if (!file.type.startsWith('image/')) continue;
            showToast('上传中...');
            const imageUrl = await uploadImage(file);
            if (!imageUrl) { showToast('上传失败'); continue; }

            const id = Date.now().toString() + Math.random().toString(36).slice(2, 6);
            await supabase.from('gallery').insert({
                id, name: file.name.replace(/\.[^.]+$/, ''),
                category: 'daily', date: new Date().toLocaleDateString('zh-CN'), image_url: imageUrl
            });
            galleryData.unshift({
                id, name: file.name.replace(/\.[^.]+$/, ''),
                category: 'daily', date: new Date().toLocaleDateString('zh-CN'), image_url: imageUrl
            });
            renderGallery();
            showToast('照片已添加');
        }
    }

    let currentFilter = 'all';
    function renderGallery() {
        galleryGrid.innerHTML = '';
        const filtered = currentFilter === 'all'
            ? galleryData
            : galleryData.filter(g => g.category === currentFilter);

        filtered.forEach((item, i) => {
            const div = document.createElement('div');
            div.className = 'gallery-item';
            div.style.animationDelay = (i * 0.05) + 's';
            div.innerHTML = `
                <img src="${item.image_url}" alt="${item.name}">
                <button class="delete-btn" data-id="${item.id}">&times;</button>
                <div class="gallery-item-overlay">
                    <h4>${item.name}</h4>
                    <span>${item.date}</span>
                </div>
            `;
            div.querySelector('img').addEventListener('click', () => openModal(item.image_url, item.name));
            div.querySelector('.delete-btn').addEventListener('click', async (e) => {
                e.stopPropagation();
                await deleteImage(item.image_url);
                await supabase.from('gallery').delete().eq('id', item.id);
                galleryData = galleryData.filter(g => g.id !== item.id);
                renderGallery();
                showToast('照片已删除');
            });
            galleryGrid.appendChild(div);
        });

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
        bindUploadZone();
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
    let momentFile = null;

    momentUploadTrigger.addEventListener('click', () => momentFileInput.click());
    momentFileInput.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (!file) return;
        momentFile = file;
        showToast('图片已选择');
    });

    momentSubmit.addEventListener('click', async () => {
        const text = momentText.value.trim();
        if (!text && !momentFile) { showToast('请写下你的心情'); return; }

        momentSubmit.textContent = '发布中...';
        momentSubmit.disabled = true;

        let imageUrl = '';
        if (momentFile) imageUrl = await uploadImage(momentFile) || '';

        const id = Date.now().toString();
        const time = new Date().toLocaleString('zh-CN');
        await supabase.from('moments').insert({ id, text, image_url: imageUrl, time });
        momentsData.unshift({ id, text, image_url: imageUrl, time });

        momentSubmit.textContent = '发布';
        momentSubmit.disabled = false;
        renderMoments();
        momentText.value = '';
        momentFile = null;
        momentFileInput.value = '';
        showToast('心情已记录');
    });

    function renderMoments() {
        momentsFeed.innerHTML = '';
        momentsData.forEach((item, i) => {
            const card = document.createElement('div');
            card.className = 'moment-card feed-card';
            card.style.animationDelay = (i * 0.05) + 's';
            card.innerHTML = `
                <button class="moment-feed-delete" data-id="${item.id}">删除</button>
                ${item.text ? `<p class="moment-feed-text">${item.text}</p>` : ''}
                ${item.image_url ? `<img class="moment-feed-image" src="${item.image_url}" alt="心情图片">` : ''}
                <div class="moment-feed-time">${item.time}</div>
            `;
            card.querySelector('.moment-feed-delete').addEventListener('click', async () => {
                if (item.image_url) await deleteImage(item.image_url);
                await supabase.from('moments').delete().eq('id', item.id);
                momentsData = momentsData.filter(m => m.id !== item.id);
                renderMoments();
                showToast('已删除');
            });
            const img = card.querySelector('.moment-feed-image');
            if (img) img.addEventListener('click', () => openModal(item.image_url, item.time));
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
    loadAll();
})();
