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
    return ({ node }) => {
      const dom = document.createElement('div');
      dom.setAttribute('data-type', 'voice-memo');
      dom.setAttribute('data-src', node.attrs.src || '');
      dom.setAttribute('data-title', node.attrs.title || 'Voice Memo');
      dom.contentEditable = 'false';
      dom.className =
        'my-3 p-3 rounded-xl bg-black/5 dark:bg-white/5 border border-notes-lightBorder dark:border-notes-darkBorder flex flex-col gap-2 max-w-md select-none';

      const header = document.createElement('div');
      header.className =
        'text-xs font-semibold text-amber-600 dark:text-notes-yellow flex items-center gap-1.5';
      header.textContent = `🎙️ ${node.attrs.title || 'Voice Memo'}`;

      const audio = document.createElement('audio');
      audio.controls = true;
      audio.preload = 'metadata';
      audio.src = node.attrs.src || '';
      audio.className = 'w-full h-10';
      // Prevent ProseMirror from intercepting clicks/touches on the native audio player controls
      audio.addEventListener('mousedown', (e) => e.stopPropagation());
      audio.addEventListener('touchstart', (e) => e.stopPropagation(), { passive: true });
      audio.addEventListener('click', (e) => e.stopPropagation());

      dom.appendChild(header);
      dom.appendChild(audio);

      return {
        dom,
        update: (updatedNode) => {
          if (updatedNode.type.name !== 'audio') return false;
          const nextSrc = updatedNode.attrs.src || '';
          const nextTitle = updatedNode.attrs.title || 'Voice Memo';
          dom.setAttribute('data-src', nextSrc);
          dom.setAttribute('data-title', nextTitle);
          header.textContent = `🎙️ ${nextTitle}`;
          if (audio.getAttribute('src') !== nextSrc) {
            audio.src = nextSrc;
          }
          return true;
        },
        stopEvent: () => true
      };
    };
  }
});
