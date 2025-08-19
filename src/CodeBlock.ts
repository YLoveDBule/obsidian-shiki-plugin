import { type MarkdownPostProcessorContext, MarkdownRenderChild } from 'obsidian';
import type ShikiPlugin from 'src/main';
import { updateCopyButton } from 'src/general/copyButton';
import { detectReadingMode } from 'src/general/viewMode';

export class CodeBlock extends MarkdownRenderChild {
	plugin: ShikiPlugin;
	source: string;
	language: string;
	ctx: MarkdownPostProcessorContext;
	cachedMetaString: string;
	private io?: IntersectionObserver;
	private hasRendered = false;
	private copyBtn?: HTMLButtonElement;

	constructor(plugin: ShikiPlugin, containerEl: HTMLElement, source: string, language: string, ctx: MarkdownPostProcessorContext) {
		super(containerEl);

		this.plugin = plugin;
		this.source = source;
		this.language = language;
		this.ctx = ctx;
		this.cachedMetaString = '';
	}

	private getMetaString(): string {
		const sectionInfo = this.ctx.getSectionInfo(this.containerEl);

		if (sectionInfo === null) {
			return '';
		}

		const lines = sectionInfo.text.split('\n');
		const startLine = lines[sectionInfo.lineStart];

		// regexp to match the text after the code block language
		const regex = new RegExp('^[^`~]*?\\s*(```+|~~~+)' + this.language + ' (.*)', 'g');
		const match = regex.exec(startLine);
		if (match !== null) {
			return match[2];
		} else {
			return '';
		}
	}

	private async render(metaString: string): Promise<void> {
		await this.plugin.highlighter.renderWithEc(this.source, this.language, metaString, this.containerEl);
		this.hasRendered = true;
		this.ensureCopyButton();
	}

	public async rerenderOnNoteChange(): Promise<void> {
		// compare the new meta string to the cached one
		// only rerender if they are different, to avoid unnecessary work
		// since the meta string is likely to be the same most of the time
		// and if the code block content changes obsidian will rerender for us
		const newMetaString = this.getMetaString();
		if (newMetaString !== this.cachedMetaString) {
			this.cachedMetaString = newMetaString;
			// If not rendered yet (not visible), skip real render to avoid extra work
			if (this.hasRendered) {
				await this.render(newMetaString);
			}
		}
	}

	public async forceRerender(): Promise<void> {
		await this.render(this.cachedMetaString);
	}

	public onload(): void {
		super.onload();

		this.plugin.addActiveCodeBlock(this);

		this.cachedMetaString = this.getMetaString();
		// Lazy render: wait until the element is in viewport
		this.setupLazyObserver();
	}

	public onunload(): void {
		super.onunload();

		this.plugin.removeActiveCodeBlock(this);

		if (this.io) {
			this.io.disconnect();
			this.io = undefined;
		}

		if (this.copyBtn) {
			this.copyBtn.remove();
			this.copyBtn = undefined;
		}
		this.containerEl.empty();
		this.containerEl.innerText = 'unloaded shiki code block';
	}

	private setupLazyObserver(): void {
		// In some export modes, intersection may not trigger; render immediately
		const fallbackImmediate = () => {
			void this.render(this.cachedMetaString);
		};

		if (typeof IntersectionObserver === 'undefined') {
			fallbackImmediate();
			return;
		}

		let initial = true;
		this.io = new IntersectionObserver(
			(entries, obs) => {
				for (const entry of entries) {
					if (entry.isIntersecting || entry.intersectionRatio > 0) {
						obs.unobserve(entry.target);
						void this.render(this.cachedMetaString);
					}
				}
			},
			{
				root: null,
				rootMargin: '200px 0px', // pre-render slightly before entering viewport
				threshold: [0, 0.01, 0.1],
			},
		);

		// If the element is already visible (e.g., very short doc), ensure observation kicks in
		this.io.observe(this.containerEl);

		// Safety: if observer never fires (rare), render on next microtask for visible docs
		queueMicrotask(() => {
			if (initial && !this.hasRendered) {
				// Try a quick check using getBoundingClientRect
				const rect = this.containerEl.getBoundingClientRect();
				const vh = window.innerHeight || document.documentElement.clientHeight;
				if (rect.top < vh + 50) {
					void this.render(this.cachedMetaString);
				}
				initial = false;
			}
		});
	}

	private ensureCopyButton(): void {
		// Only show copy button in reading/preview mode (unified detection)
		const shouldShow = detectReadingMode({ container: this.ctx.containerEl });

		this.copyBtn = updateCopyButton({
			container: this.containerEl,
			shouldShow,
			getText: () => this.source,
			prevBtn: this.copyBtn,
		});
	}
}
