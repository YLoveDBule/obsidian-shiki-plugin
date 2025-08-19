/**
 * Unified utilities for reading/preview mode detection and copy button container selection.
 */

export type RenderMode = 'textarea' | 'pre' | 'editablePre' | 'codemirror' | undefined;

function hasObClass(el: Element | undefined | null, cls: string): boolean {
	if (!el) return false;
	const anyEl = el as any;
	// Keep original semantics: if obsidian's hasClass exists, use it directly (some code may pass with leading dot)
	if (typeof anyEl.hasClass === 'function') return !!anyEl.hasClass(cls);
	// Fallback to native classList.contains, normalize class name (strip leading dot if present)
	const clsName = cls.startsWith('.') ? cls.slice(1) : cls;
	return el.classList.contains(clsName);
}

/**
 * Detect if we are in reading/preview-like context.
 * Mirrors existing checks used across components to avoid behavior changes.
 */
export function detectReadingMode(opts: { container?: HTMLElement; el?: HTMLElement } = {}): boolean {
	const { container, el } = opts;
	const inReadingContainer = hasObClass(container, 'markdown-preview-section') || hasObClass(container, 'markdown-preview-view');
	const isMarkdownRendered = hasObClass(el, '.markdown-rendered') && !hasObClass(el, '.cm-preview-code-block');
	return inReadingContainer || isMarkdownRendered;
}

/**
 * Select the appropriate container element to inject the copy button into.
 * - textarea/editablePre modes: prefer the inner `.editable-codeblock` wrapper if present
 * - pre mode: use the root element
 * - fallback: use the first `.editable-codeblock` under root, else root
 */
export function getCopyContainer(root: HTMLElement, mode?: RenderMode): HTMLElement {
	if (mode === 'textarea' || mode === 'editablePre') {
		const inner = root.querySelector<HTMLElement>(':scope > .editable-codeblock');
		if (inner) return inner;
	}
	if (mode === 'pre') return root;

	// Fallbacks
	const inner = root.querySelector<HTMLElement>('.editable-codeblock');
	return inner ?? root;
}
