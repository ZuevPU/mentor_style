const WEB_APP_URL = 'https://script.google.com/macros/s/AKfycbzV0mgJI3K9L_QMPYmd1GtZ_l957IAdBIHn8hr4Q1GKtpzEl9gWE6WLaPl3eb6Eq8wg/exec'; // Используем ваш URL

document.addEventListener('DOMContentLoaded', async function () {
  const tg = window.Telegram.WebApp;
  tg.expand();

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
  const userList = document.getElementById('user-list');
  const emptyDirectoryMessage = document.getElementById('empty-directory-message');

  let currentUser = {
    telegram_id: null,
    username: null,
    role: 'наставляемый', // default
    name: '',
    city: '',
    job: '',
    hobby: '',
    profile_bp_url: '',
    photo_url: 'https://via.placeholder.com/100?text=Фото'
  };

  // --- Инициализация ---
  tg.ready();

  // Получаем данные пользователя Telegram (если доступны)
  if (tg.initDataUnsafe && tg.initDataUnsafe.user) {
    currentUser.telegram_id = tg.initDataUnsafe.user.id;
    currentUser.username = tg.initDataUnsafe.user.username || `id${tg.initDataUnsafe.user.id}`; // username может отсутствовать
    if (tg.initDataUnsafe.user.photo_url) {
      // Можно использовать фото из ТГ как дефолтное, если своего еще нет
      // currentUser.photo_url = tg.initDataUnsafe.user.photo_url;
      // avatarPreview.src = currentUser.photo_url;
      // photoUrlInput.value = currentUser.photo_url;
    }
    if (tg.initDataUnsafe.user.first_name) {
      nameInput.value = `${tg.initDataUnsafe.user.first_name || ''} ${tg.initDataUnsafe.user.last_name || ''}`.trim();
    }
  } else {
    console.warn("Telegram user data not available. Running in browser mode?");
    // Для отладки вне Telegram можно задать фейковые данные
    // currentUser.telegram_id = 123456789;
    // currentUser.username = "testuser";
  }

  // --- Управление профилем ---
  photoUrlInput.addEventListener('input', () => {
    if (photoUrlInput.value && photoUrlInput.checkValidity()) {
      avatarPreview.src = photoUrlInput.value;
    } else if (!photoUrlInput.value) {
      avatarPreview.src = 'https://via.placeholder.com/100?text=Фото';
    }
  });

  roleSelect.addEventListener('change', () => {
    currentUser.role = roleSelect.value;
    updateDirectoryVisibilityAndTitle();
    fetchAllUsersForDirectory(); // Перезагружаем каталог, т.к. роль могла измениться
  });


  // Настройка главной кнопки Telegram для сохранения
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

    tg.MainButton.showProgress();

    const profileData = {
      telegram_id: currentUser.telegram_id,
      username: currentUser.username,
      role: roleSelect.value,
      name: nameInput.value.trim(),
      city: cityInput.value.trim(),
      job: jobInput.value.trim(),
      position: positionInput.value.trim(),
      hobby: hobbyInput.value.trim(),
      profile_bp_url: profileBpUrlInput.value.trim(),
      photo_url: photoUrlInput.value.trim() || 'https://via.placeholder.com/100?text=Фото'
    };

    try {
      await saveUserProfileData(profileData); // Используем функцию для отправки на Google Apps Script
      currentUser = { ...currentUser, ...profileData }; // Обновляем локальные данные
      tg.showAlert("Профиль успешно сохранен!");
      updateDirectoryVisibilityAndTitle();
      await fetchAllUsersForDirectory(); // Обновляем каталог
    } catch (error) {
      console.error("Ошибка сохранения профиля:", error);
      tg.showAlert(`Ошибка сохранения: ${error.message || 'Попробуйте позже.'}`);
    } finally {
      tg.MainButton.hideProgress();
    }
  });
  tg.MainButton.show(); // Показываем кнопку сохранения сразу


  function populateProfileForm(data) {
    if (!data) return;
    nameInput.value = data.name || '';
    cityInput.value = data.city || '';
    hobbyInput.value = data.hobby || '';
    jobInput.value = data.job || '';
    positionInput.value = data.position || '';
    profileBpUrlInput.value = data.profile_url || ''; // Обратите внимание, здесь profile_url, как в структуре таблицы
    roleSelect.value = data.role || 'наставляемый';
    photoUrlInput.value = data.photo_url || '';
    avatarPreview.src = data.photo_url || 'https://via.placeholder.com/100?text=Фото';

    // Обновляем currentUser на случай, если данные из бэка пришли
    currentUser = { ...currentUser, ...data };
  }

  // --- Управление каталогом ---
  function updateDirectoryVisibilityAndTitle() {
    if (currentUser.role === 'наставник') {
      directoryTitle.textContent = "Каталог Наставляемых";
    } else {
      directoryTitle.textContent = "Каталог Наставников";
    }
  }

  function renderUserDirectory(users) {
    userList.innerHTML = ''; // Очищаем предыдущий список
    if (!users || users.length === 0) {
      emptyDirectoryMessage.style.display = 'block';
      return;
    }
    emptyDirectoryMessage.style.display = 'none';

    const roleToDisplay = currentUser.role === 'наставник' ? 'наставляемый' : 'наставник';
    const filteredUsers = users.filter(user => user.role === roleToDisplay && user.telegram_id !== currentUser.telegram_id);

    if (filteredUsers.length === 0) {
      emptyDirectoryMessage.textContent = `В каталоге пока нет ${roleToDisplay === 'наставник' ? 'наставников' : 'наставляемых'}.`;
      emptyDirectoryMessage.style.display = 'block';
      return;
    }


    filteredUsers.forEach(user => {
      const card = document.createElement('div');
      card.className = 'user-card';
      card.innerHTML = `
          <img src="${user.photo_url || 'https://via.placeholder.com/80?text=Фото'}" alt="Фото ${user.name}" class="user-avatar">
          <div class="user-info">
            <h3>${user.name || 'Имя не указано'} ${user.city ? `(${user.city})` : ''}</h3>
            ${user.hobby ? `<p><strong>Хобби:</strong> ${user.hobby}</p>` : ''}
            ${user.job || user.position ? `<p><strong>Работа:</strong> ${user.job || ''}${user.job && user.position ? ', ' : ''}${user.position || ''}</p>` : ''}
          </div>
          ${user.username ? `<button class="contact-button" data-username="${user.username}">Связаться</button>` : ''}
      `;
      userList.appendChild(card);
    });

    // Добавляем обработчики для кнопок "Связаться"
    document.querySelectorAll('.contact-button').forEach(button => {
      button.addEventListener('click', () => {
        const username = button.dataset.username;
        if (username) {
          tg.openTelegramLink(`https://t.me/${username}`);
        } else {
          tg.showAlert("У пользователя не указан username для связи.");
        }
      });
    });
  }


  // --- Функции для работы с Google Apps Script ---

  async function saveUserProfileData(data) {
    try {
      const response = await fetch(WEB_APP_URL, {
        method: 'POST',
        mode: 'cors',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(data)
      });
      const result = await response.json();
      if (!response.ok || result.error) {
        throw new Error(result.error || `Ошибка сохранения данных: ${response.status}`);
      }
      console.log('Данные успешно сохранены:', result);
      return result;
    } catch (error) {
      console.error('Ошибка при сохранении данных:', error);
      throw error;
    }
  }

  async function loadUserProfile() {
    if (!currentUser.telegram_id) {
      console.warn('Не удалось определить telegram_id для загрузки профиля.');
      return null;
    }
    try {
      const response = await fetch(`${WEB_APP_URL}?telegram_id=${currentUser.telegram_id}`, {
        method: 'GET',
        mode: 'cors'
      });
      const result = await response.json();
      if (!response.ok || result.error) {
        console.warn('Профиль не найден или ошибка при загрузке:', result.error);
        return null;
      }
      console.log('Профиль пользователя загружен:', result);
      populateProfileForm(result);
      return result;
    } catch (error) {
      console.error('Ошибка при загрузке профиля:', error);
      return null;
    }
  }

  async function fetchAllUsersForDirectory() {
    try {
      const response = await fetch(WEB_APP_URL, {
        method: 'GET',
        mode: 'cors'
      });
      const result = await response.json();
      if (!response.ok || result.error) {
        console.error('Ошибка при загрузке списка пользователей:', result.error);
        renderUserDirectory([]);
        return [];
      }
      console.log('Список всех пользователей:', result.users);
      renderUserDirectory(result.users);
      return result.users;
    } catch (error) {
      console.error('Ошибка при загрузке списка пользователей:', error);
      renderUserDirectory([]);
      return [];
    }
  }

  // Вызываем загрузку профиля и списка пользователей при инициализации
  await loadUserProfile();
  await fetchAllUsersForDirectory();
  updateDirectoryVisibilityAndTitle();

});
