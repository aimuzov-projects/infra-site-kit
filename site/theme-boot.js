// Ставит выбранную тему на `<html data-theme>` до отрисовки, иначе страница мигнёт системной.
// Обычный скрипт, не модуль: модули откладываются до разбора страницы. Ключ хранилища
// берётся из `data-key` тега, пара -- `applyTheme` из theme.js. Подключает theme-boot.astro.
try {
	const theme = localStorage.getItem(document.currentScript?.dataset.key || 'theme')

	if (theme === 'light' || theme === 'dark') document.documentElement.dataset.theme = theme
} catch {
	// Хранилище закрыто -- остаётся тема системы.
}
