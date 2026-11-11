const card = document.getElementById('pnl-card');
const usernameInput = document.getElementById('username-input');
const tickerInput = document.getElementById('ticker-input');
const pnlInput = document.getElementById('pnl-input');
const positionInput = document.getElementById('position-input');
const hidePositionInput = document.getElementById('hide-position-input');
const dateInput = document.getElementById('date-input');
const promoFrameInput = document.getElementById('promo-frame-input');
const promoFrame = document.getElementById('promo-frame');
const toast = document.getElementById('toast');
let toastTimer;

const today = new Date();
dateInput.value = [
  today.getFullYear(),
  String(today.getMonth() + 1).padStart(2, '0'),
  String(today.getDate()).padStart(2, '0')
].join('-');

function formatUsd(value) {
  return Math.abs(value).toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });
}

function formatTradeDate(value) {
  if (!value) return '—';
  const [year, month, day] = value.split('-').map(Number);
  const date = new Date(year, month - 1, day);
  return new Intl.DateTimeFormat('en-US', { dateStyle: 'medium' }).format(date);
}

function updateCard() {
  const username = usernameInput.value.trim() || '@yourname';
  const ticker = tickerInput.value.trim().toUpperCase() || 'TOKEN';
  const pnl = Number(pnlInput.value) || 0;
  const position = Math.max(0, Number(positionInput.value) || 0);
  const profit = position * pnl / 100;

  document.getElementById('card-username').textContent = username.startsWith('@') ? username : `@${username}`;
  document.getElementById('card-ticker').textContent = ticker;
  document.getElementById('card-ticker-mark').textContent = ticker.slice(0, 4);
  const pnlNode = document.getElementById('card-pnl');
  pnlNode.textContent = `${pnl > 0 ? '+' : ''}${pnl.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}%`;
  pnlNode.classList.toggle('is-loss', pnl < 0);
  card.classList.toggle('is-loss', pnl < 0);
  document.getElementById('card-profit').textContent = `${profit > 0 ? '+' : profit < 0 ? '-' : ''}$${formatUsd(profit)}`;
  document.getElementById('card-profit-label').textContent = pnl < 0 ? 'NET LOSS' : 'NET P&L';
  document.getElementById('card-position').textContent = hidePositionInput.checked ? '••••••' : `$${formatUsd(position)}`;
  document.getElementById('card-date').textContent = formatTradeDate(dateInput.value);
  document.getElementById('promo-username').textContent = username.replace(/^@/, '') || 'yourname';
}

function updatePromoFrame() {
  const enabled = promoFrameInput.checked;
  promoFrame.classList.toggle('is-enabled', enabled);
  document.getElementById('resolution-label').lastChild.textContent = enabled
    ? ' 1000 × 1112 PNG WITH FRAME'
    : ' 1000 × 1000 PNG';
}

function showToast(message, isError = false) {
  window.clearTimeout(toastTimer);
  toast.textContent = message;
  toast.style.color = isError ? '#fca5a5' : '';
  toastTimer = window.setTimeout(() => {
    toast.textContent = '';
    toast.style.color = '';
  }, 4000);
}

function readImage(file) {
  return new Promise((resolve, reject) => {
    if (!file.type.startsWith('image/')) {
      reject(new Error('Choose a valid image file.'));
      return;
    }
    if (file.size > 8 * 1024 * 1024) {
      reject(new Error('Images must be smaller than 8 MB.'));
      return;
    }
    const reader = new FileReader();
    reader.onload = () => typeof reader.result === 'string'
      ? resolve(reader.result)
      : reject(new Error('Could not read the selected image.'));
    reader.onerror = () => reject(new Error('Could not read the selected image.'));
    reader.readAsDataURL(file);
  });
}

async function setImageFromInput(input, target, onReady) {
  const file = input.files?.[0];
  if (!file) return;
  try {
    const dataUrl = await readImage(file);
    target.src = dataUrl;
    await target.decode();
    onReady?.(dataUrl);
  } catch (error) {
    showToast(error.message, true);
  } finally {
    input.value = '';
  }
}

function setTheme(theme) {
  card.dataset.theme = theme;
  card.style.backgroundImage = '';
  document.querySelectorAll('.theme-swatch').forEach(button => {
    const selected = button.dataset.theme === theme;
    button.classList.toggle('is-selected', selected);
    button.setAttribute('aria-pressed', String(selected));
  });
  document.querySelector('.background-upload').classList.remove('is-selected');
}

async function createCardBlob() {
  if (typeof html2canvas !== 'function') {
    throw new Error('The image export tool did not load. Check your internet connection and try again.');
  }
  const promoEnabled = promoFrameInput.checked;
  const source = promoEnabled ? promoFrame : card;
  const clone = source.cloneNode(true);
  const exportCard = promoEnabled ? clone.querySelector('#pnl-card') : clone;
  const exportWidth = promoEnabled ? 484 : 480;
  const exportHeight = promoEnabled ? 538 : 480;
  clone.classList.toggle('is-enabled', promoEnabled);
  clone.style.position = 'fixed';
  clone.style.left = '-10000px';
  clone.style.top = '0';
  clone.style.width = `${exportWidth}px`;
  clone.style.height = `${exportHeight}px`;
  clone.style.maxWidth = 'none';
  clone.style.aspectRatio = 'auto';
  clone.style.containerType = 'normal';
  if (promoEnabled) {
    exportCard.style.width = '480px';
    exportCard.style.height = '480px';
    exportCard.style.maxWidth = 'none';
    exportCard.style.aspectRatio = 'auto';
  } else {
    clone.style.containerType = 'normal';
  }
  document.body.appendChild(clone);

  try {
    await Promise.all(Array.from(clone.querySelectorAll('img')).map(image => image.decode()));
    const renderedCanvas = await html2canvas(clone, {
      scale: 1000 / exportWidth,
      width: exportWidth,
      height: exportHeight,
      useCORS: true,
      backgroundColor: '#090b10',
      logging: false
    });
    const outputWidth = 1000;
    const outputHeight = promoEnabled ? Math.round(exportHeight * outputWidth / exportWidth) : 1000;
    const canvas = renderedCanvas.width === outputWidth && renderedCanvas.height === outputHeight
      ? renderedCanvas
      : Object.assign(document.createElement('canvas'), { width: outputWidth, height: outputHeight });
    if (canvas !== renderedCanvas) {
      canvas.getContext('2d').drawImage(renderedCanvas, 0, 0, outputWidth, outputHeight);
    }
    return await new Promise((resolve, reject) => {
      canvas.toBlob(blob => blob ? resolve(blob) : reject(new Error('Could not create the PNG image.')), 'image/png');
    });
  } finally {
    clone.remove();
  }
}

function downloadBlob(blob) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `xoinchain-pnl-${Date.now()}.png`;
  link.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

async function withBusyButton(button, action) {
  button.disabled = true;
  try {
    await action();
  } catch (error) {
    showToast(error.message || 'Something went wrong. Please try again.', true);
  } finally {
    button.disabled = false;
  }
}

[
  usernameInput,
  tickerInput,
  pnlInput,
  positionInput,
  dateInput
].forEach(input => input.addEventListener('input', updateCard));
hidePositionInput.addEventListener('change', updateCard);
promoFrameInput.addEventListener('change', updatePromoFrame);

document.getElementById('avatar-input').addEventListener('change', event => {
  setImageFromInput(event.currentTarget, document.getElementById('card-avatar'), dataUrl => {
    document.getElementById('avatar-preview').src = dataUrl;
  });
});

document.getElementById('background-input').addEventListener('change', async event => {
  const input = event.currentTarget;
  const file = input.files?.[0];
  if (!file) return;
  try {
    const image = new Image();
    image.src = await readImage(file);
    await image.decode();
    card.dataset.theme = 'photo';
    card.style.backgroundImage = `linear-gradient(145deg, rgba(6, 8, 12, .78), rgba(6, 8, 12, .9)), url("${image.src}")`;
    document.querySelectorAll('.theme-swatch').forEach(button => {
      button.classList.remove('is-selected');
      button.setAttribute('aria-pressed', 'false');
    });
    document.querySelector('.background-upload').classList.add('is-selected');
  } catch (error) {
    showToast(error.message, true);
  } finally {
    input.value = '';
  }
});

document.querySelectorAll('.theme-swatch').forEach(button => {
  button.addEventListener('click', () => setTheme(button.dataset.theme));
});

document.getElementById('download-button').addEventListener('click', event => {
  withBusyButton(event.currentTarget, async () => {
    downloadBlob(await createCardBlob());
    showToast('Your 1000 × 1000 PNG is ready to share.');
  });
});

document.getElementById('share-button').addEventListener('click', event => {
  withBusyButton(event.currentTarget, async () => {
    const blob = await createCardBlob();
    const file = new File([blob], 'xoinchain-pnl.png', { type: 'image/png' });
    if (navigator.canShare?.({ files: [file] }) && navigator.share) {
      await navigator.share({ files: [file], title: 'My Xoinchain trade result' });
      showToast('Your card is ready to share.');
      return;
    }
    if (navigator.clipboard?.write && typeof ClipboardItem !== 'undefined') {
      await navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })]);
      window.open('https://x.com/compose/post', '_blank', 'noopener,noreferrer');
      showToast('Card copied. Paste it into your X post.');
      return;
    }
    downloadBlob(blob);
    window.open('https://x.com/compose/post', '_blank', 'noopener,noreferrer');
    showToast('Card downloaded. Attach the PNG to your X post.');
  });
});

updateCard();
