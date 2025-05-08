document.addEventListener('DOMContentLoaded', function () {
    // Инициализация Telegram Web App
    const tg = window.Telegram.WebApp;
    tg.expand(); // Расширяем приложение на весь экран
    tg.ready();  // Сообщаем Telegram, что приложение готово

    // Элементы DOM
    const profileForm = document.getElementById('profile-form');
    const avatarPreview = document.getElementById('avatar-preview');
    const photoUrlInput = document.getElementById('photo_url');
    const nameInput = document.getElementById('name');
    const cityInput = document.getElementById('city');
    const hobbyInput = document.getElementById('hobby');
    const jobInput = document.getElementById('job');
    const positionInput = document.getElementById('position');
    const profileBpUrlInput = document.getElementById('profile_bp_url');
    const roleSelect = document.getElementById('role');

    const directorySection = document.getElementById('directory-section');
    const directoryTitle = document.getElementById('directory-title');
    const userListContainer = document.getElementById('user-list');
    const emptyDirectoryMessage = document.getElementById('empty-directory-message');

    // Текущий пользователь (будет загружен или создан)
    let currentUser = {
        telegram_id: null,
        username: null, // Telegram username
        role: 'наставляемый', // Роль по умолчанию
        name: '',
        city: '',
        job: '',
        position: '',
        hobby: '',
        profile_bp_url: '',
        photo_url: 'https://placehold.co/100x100/E0E0E0/B0B0B0?text=Фото' // URL фото по умолчанию
    };

    // --- Инициализация данных пользователя ---
    function initializeUser() {
        if (tg.initDataUnsafe && tg.initDataUnsafe.user) {
            const tgUser = tg.initDataUnsafe.user;
            currentUser.telegram_id = tgUser.id;
            currentUser.username = tgUser.username || `id${tgUser.id}`; // username может отсутствовать, используем id как fallback

            // Предзаполнение ФИО, если возможно
            if (!currentUser.name && (tgUser.first_name || tgUser.last_name)) {
                nameInput.value = `${tgUser.first_name || ''} ${tgUser.last_name || ''}`.trim();
            }
            // Можно использовать фото из ТГ как дефолтное, если своего еще нет и пользователь не загружал
            // if (!currentUser.photo_url && tgUser.photo_url) {
            //     currentUser.photo_url = tgUser.photo_url;
            //     photoUrlInput.value = tgUser.photo_url;
            //     avatarPreview.src = tgUser.photo_url;
            // }
            console.log("Telegram User Initialized:", currentUser);
        } else {
            console.warn("Telegram user data not available. Running in browser mode or initData is missing.");
            // Для отладки вне Telegram можно задать фейковые данные
            // currentUser.telegram_id = 123456789;
            // currentUser.username = "test_user_debug";
            // nameInput.value = "Тестовый Пользователь";
        }
    }

    // --- Управление профилем ---
    photoUrlInput.addEventListener('input', () => {
        const url = photoUrlInput.value.trim();
        if (url && (url.startsWith('http://') || url.startsWith('https://'))) {
            try {
                new URL(url); // Проверка валидности URL
                avatarPreview.src = url;
                avatarPreview.onerror = () => { // Fallback если изображение не загрузилось
                    avatarPreview.src = 'https://placehold.co/100x100/E0E0E0/B0B0B0?text=Ошибка';
                };
            } catch (_) {
                // Невалидный URL, можно оставить старое изображение или плейсхолдер
                // avatarPreview.src = currentUser.photo_url || 'https://placehold.co/100x100/E0E0E0/B0B0B0?text=Фото';
            }
        } else if (!url) {
            avatarPreview.src = 'https://placehold.co/100x100/E0E0E0/B0B0B0?text=Фото';
        }
    });

    roleSelect.addEventListener('change', async () => {
        currentUser.role = roleSelect.value;
        updateDirectoryTitle();
        await fetchAndRenderDirectory(); // Обновляем каталог при смене роли
    });

    // Заполнение формы данными пользователя
    function populateProfileForm(userData) {
        if (!userData) return;

        nameInput.value = userData.name || '';
        cityInput.value = userData.city || '';
        hobbyInput.value = userData.hobby || '';
        jobInput.value = userData.job || '';
        positionInput.value = userData.position || '';
        profileBpUrlInput.value = userData.profile_bp_url || '';
        roleSelect.value = userData.role || 'наставляемый';
        photoUrlInput.value = userData.photo_url || '';
        avatarPreview.src = userData.photo_url || 'https://placehold.co/100x100/E0E0E0/B0B0B0?text=Фото';

        // Обновляем currentUser, если данные пришли с "бэкенда"
        currentUser = { ...currentUser, ...userData };
        updateDirectoryTitle(); // Обновить заголовок каталога на случай, если роль загрузилась
    }

    // --- Управление каталогом ---
    function updateDirectoryTitle() {
        if (currentUser.role === 'наставник') {
            directoryTitle.textContent = "Каталог Наставляемых";
        } else {
            directoryTitle.textContent = "Каталог Наставников";
        }
    }

    function renderUserCard(user) {
        const card = document.createElement('div');
        card.className = 'user-card';

        let jobInfo = '';
        if (user.job && user.position) {
            jobInfo = `${user.job}, ${user.position}`;
        } else if (user.job) {
            jobInfo = user.job;
        } else if (user.position) {
            jobInfo = user.position;
        }

        card.innerHTML = `
            <img src="${user.photo_url || 'https://placehold.co/60x60/E0E0E0/B0B0B0?text=Фото'}" alt="Фото ${user.name}" class="user-avatar-small" onerror="this.src='https://placehold.co/60x60/E0E0E0/B0B0B0?text=НетФото'">
            <div class="user-info">
                <h3 class="user-name-city">${user.name || 'Имя не указано'} ${user.city ? `(${user.city})` : ''}</h3>
                ${user.hobby ? `<p class="user-details"><strong>Хобби:</strong> ${user.hobby}</p>` : ''}
                ${jobInfo ? `<p class="user-details"><strong>Работа:</strong> ${jobInfo}</p>` : ''}
            </div>
            ${user.username ? `<button class="contact-button" data-username="${user.username}">Связаться</button>` : ''}
        `;

        if (user.username) {
            const contactButton = card.querySelector('.contact-button');
            contactButton.addEventListener('click', () => {
                tg.openTelegramLink(`https://t.me/${user.username}`);
            });
        }
        return card;
    }

    async function fetchAndRenderDirectory() {
        showLoadingIndicator(userListContainer); // Показываем индикатор загрузки
        emptyDirectoryMessage.style.display = 'none';

        try {
            const allUsers = await mockFetchAllUsers(); // ЗАГЛУШКА
            userListContainer.innerHTML = ''; // Очищаем предыдущий список

            const roleToDisplay = currentUser.role === 'наставник' ? 'наставляемый' : 'наставник';
            const filteredUsers = allUsers.filter(user =>
                user.role === roleToDisplay &&
                user.telegram_id !== currentUser.telegram_id // Не показывать себя в каталоге
            );

            if (filteredUsers.length === 0) {
                emptyDirectoryMessage.textContent = `В каталоге пока нет ${roleToDisplay === 'наставник' ? 'наставников' : 'наставляемых'}.`;
                emptyDirectoryMessage.style.display = 'block';
            } else {
                filteredUsers.forEach(user => {
                    userListContainer.appendChild(renderUserCard(user));
                });
            }
        } catch (error) {
            console.error("Ошибка загрузки каталога:", error);
            userListContainer.innerHTML = '';
            emptyDirectoryMessage.textContent = "Не удалось загрузить каталог. Попробуйте позже.";
            emptyDirectoryMessage.style.display = 'block';
            tg.showAlert("Ошибка загрузки каталога: " + (error.message || "Неизвестная ошибка"));
        } finally {
            hideLoadingIndicator(userListContainer);
        }
    }

    function showLoadingIndicator(container) {
        // Простой текстовый индикатор. Можно заменить на CSS-анимацию.
        const loadingElement = document.createElement('p');
        loadingElement.textContent = 'Загрузка...';
        loadingElement.id = 'loading-indicator';
        loadingElement.style.textAlign = 'center';
        loadingElement.style.padding = '20px';
        container.prepend(loadingElement);
    }

    function hideLoadingIndicator(container) {
        const loadingElement = container.querySelector('#loading-indicator');
        if (loadingElement) {
            loadingElement.remove();
        }
    }

    // --- Сохранение и загрузка данных (ЗАГЛУШКИ) ---
    // Имитация базы данных пользователей (для MVP)
    // В реальном приложении это будет заменено на вызовы API (Google Sheets, Firebase, etc.)
    let MOCK_DATABASE = [
        // Пример данных:
        // { telegram_id: 111, username: "mentor_anna", role: "наставник", name: "Анна Смирнова", city: "Москва", job: "UX Дизайнер", position: "Mail.Ru Group", hobby: "Фотография", profile_bp_url: "anna_bp", photo_url: "https://randomuser.me/api/portraits/women/45.jpg" },
        // { telegram_id: 222, username: "mentee_ivan", role: "наставляемый", name: "Иван Куликов", city: "Санкт-Петербург", job: "Студент", position: "ИТМО", hobby: "Программирование", profile_bp_url: "ivan_bp", photo_url: "https://randomuser.me/api/portraits/men/32.jpg" },
        // { telegram_id: 333, username: "mentor_alex", role: "наставник", name: "Алексей Новиков", city: "Казань", job: "Team Lead", position: "Ак Барс Цифровые Технологии", hobby: "Путешествия, Велоспорт", profile_bp_url: "alex_bp_url", photo_url: "https://randomuser.me/api/portraits/men/55.jpg" },
        // { telegram_id: 444, username: "mentee_olga", role: "наставляемый", name: "Ольга Зайцева", city: "Екатеринбург", job: "Начинающий аналитик", position: "СКБ Контур", hobby: "Чтение, йога", profile_bp_url: "olga_bp_123", photo_url: "https://randomuser.me/api/portraits/women/67.jpg" }
    ];

    async function mockSaveUserProfile(profileData) {
        console.log("Сохранение данных профиля (ЗАГЛУШКА):", profileData);
        return new Promise((resolve, reject) => {
            setTimeout(() => {
                if (!profileData.telegram_id) {
                    return reject(new Error("Telegram ID отсутствует, не могу сохранить."));
                }
                const existingUserIndex = MOCK_DATABASE.findIndex(u => u.telegram_id === profileData.telegram_id);
                if (existingUserIndex > -1) {
                    MOCK_DATABASE[existingUserIndex] = { ...MOCK_DATABASE[existingUserIndex], ...profileData };
                } else {
                    MOCK_DATABASE.push(profileData);
                }
                console.log("MOCK_DATABASE после сохранения:", JSON.stringify(MOCK_DATABASE, null, 2));
                resolve({ success: true, data: profileData });
            }, 500); // Имитация задержки сети
        });
    }

    async function mockLoadUserProfile(telegramId) {
        console.log("Загрузка профиля пользователя (ЗАГЛУШКА) для ID:", telegramId);
        return new Promise((resolve) => {
            setTimeout(() => {
                if (!telegramId) {
                    resolve(null); // Нет ID - нет пользователя
                    return;
                }
                const userData = MOCK_DATABASE.find(u => u.telegram_id === telegramId);
                console.log("Профиль найден (ЗАГЛУШКА):", userData);
                resolve(userData || null);
            }, 500);
        });
    }

    async function mockFetchAllUsers() {
        console.log("Загрузка всех пользователей для каталога (ЗАГЛУШКА)");
        return new Promise((resolve) => {
            setTimeout(() => {
                console.log("Все пользователи из MOCK_DATABASE:", MOCK_DATABASE);
                resolve([...MOCK_DATABASE]); // Возвращаем копию массива
            }, 300);
        });
    }

    // --- Главная кнопка Telegram ---
    tg.MainButton.setText("Сохранить профиль");
    tg.MainButton.onClick(async () => {
        if (!currentUser.telegram_id) {
            tg.showAlert("Не удалось определить ваш Telegram ID. Попробуйте перезапустить приложение.");
            return;
        }
        if (!nameInput.value.trim()) {
            tg.showAlert("Пожалуйста, укажите ваше ФИО.");
            nameInput.focus();
            return;
        }

        tg.MainButton.showProgress(); // Показать индикатор загрузки на кнопке
        tg.MainButton.disable();      // Отключить кнопку на время сохранения

        const profileDataToSave = {
            telegram_id: currentUser.telegram_id,
            username: currentUser.username, // Убедитесь, что username актуален
            role: roleSelect.value,
            name: nameInput.value.trim(),
            city: cityInput.value.trim(),
            job: jobInput.value.trim(),
            position: positionInput.value.trim(),
            hobby: hobbyInput.value.trim(),
            profile_bp_url: profileBpUrlInput.value.trim(),
            photo_url: photoUrlInput.value.trim() || 'https://placehold.co/100x100/E0E0E0/B0B0B0?text=Фото'
        };

        try {
            const result = await mockSaveUserProfile(profileDataToSave); // ЗАГЛУШКА
            currentUser = { ...currentUser, ...result.data }; // Обновляем локальные данные
            populateProfileForm(currentUser); // Обновляем форму, если нужно (например, URL фото по умолчанию)
            tg.showAlert("Профиль успешно сохранен!");
            await fetchAndRenderDirectory(); // Обновляем каталог, так как данные могли измениться
        } catch (error) {
            console.error("Ошибка сохранения профиля:", error);
            tg.showAlert(`Ошибка сохранения: ${error.message || 'Попробуйте позже.'}`);
        } finally {
            tg.MainButton.hideProgress();
            tg.MainButton.enable();
        }
    });
    tg.MainButton.show(); // Показываем кнопку сохранения

    // --- Первоначальная загрузка ---
    async function main() {
        initializeUser(); // Получаем telegram_id и username
        tg.MainButton.showProgress(); // Показываем прогресс на кнопке, пока грузим профиль

        try {
            const loadedProfile = await mockLoadUserProfile(currentUser.telegram_id); // ЗАГЛУШКА
            if (loadedProfile) {
                populateProfileForm(loadedProfile);
            } else {
                // Если профиль не найден, оставляем поля как есть (или с данными из ТГ)
                // и пользователь заполнит их для первого сохранения.
                // Убедимся, что роль в currentUser соответствует селекту.
                currentUser.role = roleSelect.value;
                updateDirectoryTitle();
            }
        } catch (error) {
            console.error("Ошибка загрузки профиля:", error);
            tg.showAlert("Не удалось загрузить ваш профиль. Можно попробовать заполнить и сохранить его заново.");
            // Устанавливаем роль по умолчанию, если загрузка не удалась
            currentUser.role = roleSelect.value;
            updateDirectoryTitle();
        } finally {
            tg.MainButton.hideProgress();
        }

        await fetchAndRenderDirectory(); // Загружаем и отображаем каталог
    }

    main(); // Запускаем основную логику приложения
});
