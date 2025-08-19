import { Notice } from 'obsidian';

export interface CopyButtonOptions {
	container: HTMLElement;
	shouldShow: boolean;
	getText: () => string;
	prevBtn?: HTMLButtonElement;
}

/**
 * Create or remove a unified copy button (.sk-copy-btn) based on shouldShow.
 * Returns the current button reference (or undefined if removed).
 */
export function updateCopyButton(opts: CopyButtonOptions): HTMLButtonElement | undefined {
	const { container, shouldShow, getText, prevBtn } = opts;

	// Cleanup previous
	if (prevBtn) {
		prevBtn.remove();
	}

	if (!shouldShow) {
		container.removeClass('sk-codeblock');
		return undefined;
	}

	// Ensure container has positioning class
	container.addClass('sk-codeblock');

	const btn = document.createElement('button');
	btn.className = 'sk-copy-btn';
	btn.type = 'button';
	btn.setAttr('aria-label', '复制代码');
	btn.title = '复制';
	btn.innerHTML = `
    <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true">
      <path fill="currentColor" d="M16 1H4c-1.1 0-2 .9-2 2v12h2V3h12V1zm3 4H8c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h11c1.1 0 2-.9 2-2V7c0-1.1-.9-2-2-2zm0 16H8V7h11v14z"/>
    </svg>`;

	btn.addEventListener('click', async e => {
		e.preventDefault();
		try {
			const text = getText();
			if (navigator.clipboard && navigator.clipboard.writeText) {
				await navigator.clipboard.writeText(text);
			} else {
				const ta = document.createElement('textarea');
				ta.value = text;
				ta.style.position = 'fixed';
				ta.style.left = '-1000px';
				document.body.appendChild(ta);
				ta.focus();
				ta.select();
				document.execCommand('copy');
				document.body.removeChild(ta);
			}
			new Notice('已复制');
		} catch (err) {
			new Notice('复制失败');
		}
	});

	container.appendChild(btn);
	return btn;
}
