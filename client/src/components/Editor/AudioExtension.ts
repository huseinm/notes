import { Node, mergeAttributes } from '@tiptap/core';

export const AudioNode = Node.create({
  name: 'audio',
  group: 'block',
  atom: true,
  selectable: true,
  draggable: true,

  addAttributes() {
    return {
      src: {
        default: null
      },
      title: {
        default: 'Voice Memo'
      }
    };
  },

  parseHTML() {
    return [
      {
        tag: 'div[data-type="voice-memo"]',
        getAttrs: (dom) => {
          const el = dom as HTMLElement;
          const audioEl = el.querySelector('audio');
          return {
            src: el.getAttribute('data-src') || audioEl?.getAttribute('src'),
            title: el.getAttribute('data-title') || 'Voice Memo'
          };
        }
      },
      {
        tag: 'audio[src]',
        getAttrs: (dom) => ({
          src: (dom as HTMLElement).getAttribute('src'),
          title: (dom as HTMLElement).getAttribute('title') || 'Voice Memo'
        })
      }
    ];
  },

  renderHTML({ HTMLAttributes }) {
    const title = HTMLAttributes.title || 'Voice Memo';
    const src = HTMLAttributes.src || '';
    return [
      'div',
      mergeAttributes({
        'data-type': 'voice-memo',
        'data-src': src,
        'data-title': title,
        contenteditable: 'false',
        class:
          'my-3 p-3 rounded-xl bg-black/5 dark:bg-white/5 border border-notes-lightBorder dark:border-notes-darkBorder flex flex-col gap-1.5 max-w-md select-none'
      }),
      [
        'div',
        {
          class: 'text-xs font-semibold text-amber-600 dark:text-notes-yellow flex items-center gap-1.5'
        },
        `🎙️ ${title}`
      ],
      [
        'audio',
        {
          controls: 'controls',
          preload: 'metadata',
          src,
          class: 'w-full h-9'
        }
      ]
    ];
  },

  addNodeView() {
    return ({ node, getPos, editor }) => {
      const dom = document.createElement('div');
      dom.setAttribute('data-type', 'voice-memo');
      dom.setAttribute('data-src', node.attrs.src || '');
      dom.setAttribute('data-title', node.attrs.title || 'Voice Memo');
      dom.contentEditable = 'false';
      dom.className =
        'my-3 p-3 rounded-xl bg-black/5 dark:bg-white/5 border border-notes-lightBorder dark:border-notes-darkBorder flex flex-col gap-2 max-w-md select-none';

      // Header row with microphone icon + editable title input
      const headerRow = document.createElement('div');
      headerRow.className = 'flex items-center gap-1.5 w-full';

      const iconSpan = document.createElement('span');
      iconSpan.className = 'text-xs select-none flex-shrink-0';
      iconSpan.textContent = '🎙️';

      const titleInput = document.createElement('input');
      titleInput.type = 'text';
      titleInput.value = node.attrs.title || 'Voice Memo';
      titleInput.placeholder = 'Voice Memo Title...';
      titleInput.title = 'Click to rename voice memo';
      titleInput.disabled = !editor.isEditable;
      titleInput.className =
        'flex-1 min-w-0 text-xs font-semibold text-amber-600 dark:text-notes-yellow bg-transparent border border-transparent hover:border-notes-lightBorder dark:hover:border-notes-darkBorder focus:border-notes-yellow focus:bg-black/5 dark:focus:bg-black/30 rounded px-1.5 py-0.5 outline-none transition-colors';

      const commitTitleChange = () => {
        const nextTitle = titleInput.value.trim() || 'Voice Memo';
        if (nextTitle === node.attrs.title) return;
        if (typeof getPos === 'function' && editor.isEditable) {
          const pos = getPos();
          if (typeof pos === 'number') {
            const tr = editor.view.state.tr.setNodeMarkup(pos, undefined, {
              ...node.attrs,
              title: nextTitle
            });
            editor.view.dispatch(tr);
          }
        }
      };

      titleInput.addEventListener('mousedown', (e) => e.stopPropagation());
      titleInput.addEventListener('touchstart', (e) => e.stopPropagation(), { passive: true });
      titleInput.addEventListener('click', (e) => e.stopPropagation());
      titleInput.addEventListener('keydown', (e) => {
        e.stopPropagation();
        if (e.key === 'Enter' || e.key === 'Escape') {
          e.preventDefault();
          titleInput.blur();
        }
      });
      titleInput.addEventListener('blur', commitTitleChange);
      titleInput.addEventListener('change', commitTitleChange);

      headerRow.appendChild(iconSpan);
      headerRow.appendChild(titleInput);

      const audio = document.createElement('audio');
      audio.controls = true;
      audio.preload = 'metadata';
      audio.src = node.attrs.src || '';
      audio.className = 'w-full h-10';
      audio.addEventListener('mousedown', (e) => e.stopPropagation());
      audio.addEventListener('touchstart', (e) => e.stopPropagation(), { passive: true });
      audio.addEventListener('click', (e) => e.stopPropagation());

      dom.appendChild(headerRow);
      dom.appendChild(audio);

      return {
        dom,
        update: (updatedNode) => {
          if (updatedNode.type.name !== 'audio') return false;
          const nextSrc = updatedNode.attrs.src || '';
          const nextTitle = updatedNode.attrs.title || 'Voice Memo';
          dom.setAttribute('data-src', nextSrc);
          dom.setAttribute('data-title', nextTitle);
          if (document.activeElement !== titleInput && titleInput.value !== nextTitle) {
            titleInput.value = nextTitle;
          }
          titleInput.disabled = !editor.isEditable;
          if (audio.getAttribute('src') !== nextSrc) {
            audio.src = nextSrc;
          }
          return true;
        },
        stopEvent: (event) => {
          const target = event.target as HTMLElement | null;
          if (target && (target === titleInput || target === audio || dom.contains(target))) {
            return true;
          }
          return false;
        }
      };
    };
  }
});
