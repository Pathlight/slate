import Debug from 'debug'
import { Range } from 'slate'
import Hotkeys from 'slate-hotkeys'
import getWindow from 'get-window'
import {
  IS_FIREFOX,
  IS_IE,
  IS_IOS,
  HAS_INPUT_EVENTS_LEVEL_2,
} from 'slate-dev-environment'

import DATA_ATTRS from '../../constants/data-attributes'
import SELECTORS from '../../constants/selectors'
import sanitizeDomOnError from '../../utils/sanitize-dom-on-error'
import safelyGetParentKeyNode from '../../utils/safely-get-parent-key-node'
import findDomNode from '../../utils/find-dom-node'

/**
 * Debug.
 *
 * @type {Function}
 */

const debug = Debug('slate:before')

/**
 * A plugin that adds the "before" browser-specific logic to the editor.
 *
 * @return {Object}
 */

function BeforePlugin() {
  let activeElement = null
  let isComposing = false
  let isCopying = false
  let isDragging = false
  let isUserActionPerformed = false

  /**
   * On before input.
   *
   * @param {Event} event
   * @param {Editor} editor
   * @param {Function} next
   */

  function onBeforeInput(event, editor, next) {
    // If the user has started a composition for something like a chinese character
    // then wait to modify slate's AST and wait to force a react render until the composition is done.
    if (isComposing) return

    const isSynthetic = !!event.nativeEvent
    if (editor.readOnly) return
    isUserActionPerformed = true

    // COMPAT: If the browser supports Input Events Level 2, we will have
    // attached a custom handler for the real `beforeinput` events, instead of
    // allowing React's synthetic polyfill, so we need to ignore synthetics.
    if (isSynthetic && HAS_INPUT_EVENTS_LEVEL_2) return

    // If the event is synthetic, it's React's polyfill of `beforeinput` that
    // isn't a true `beforeinput` event with meaningful information. It only
    // gets triggered for character insertions, so we can just insert directly.
    // Single character inserts can be handled natively. Allows native rendering
    // which preserves the native browser spell check handling.
    if (isSynthetic) {
      const isCollapsed = editor.value.selection.isCollapsed

      if (!isCollapsed) {
        editor.delete()
      }

      const inputText = (event.data || '')
        .replace(/\n\r/g, '\n')
        .replace(/\r/g, '\n')
      const hasNewLines = inputText.indexOf('\n') >= 0

      if (isCollapsed && !hasNewLines) {
        saveCurrentNativeNode(editor)
      } else {
        event.preventDefault()

        if (!hasNewLines) {
          editor.insertText(event.data, null, false)
        } else {
          const chunks = inputText.split('\n')

          chunks.map((text, i) => {
            if (text.length !== 0) {
              editor.insertText(text, null, false)
            }

            if (i !== chunks.length - 1) {
              editor.splitBlock()
            }
          })
        }
      }
    } else {
      debug('onBeforeInput', { event })
      next()
    }
  }

  /**
   * On blur.
   *
   * @param {Event} event
   * @param {Editor} editor
   * @param {Function} next
   */

  function onBlur(event, editor, next) {
    if (isCopying) return
    if (editor.readOnly) return

    const { relatedTarget, target } = event
    const window = getWindow(target)

    // COMPAT: If the current `activeElement` is still the previous one, this is
    // due to the window being blurred when the tab itself becomes unfocused, so
    // we want to abort early to allow to editor to stay focused when the tab
    // becomes focused again.
    if (activeElement === window.document.activeElement) return

    // COMPAT: The `relatedTarget` can be null when the new focus target is not
    // a "focusable" element (eg. a `<div>` without `tabindex` set).
    if (relatedTarget) {
      const el = editor.findDOMNode([])

      // COMPAT: The event should be ignored if the focus is returning to the
      // editor from an embedded editable element (eg. an <input> element inside
      // a void node).
      if (relatedTarget === el) return

      // COMPAT: The event should be ignored if the focus is moving from the
      // editor to inside a void node's spacer element.
      if (relatedTarget.hasAttribute(DATA_ATTRS.SPACER)) return

      // COMPAT: The event should be ignored if the focus is moving to a non-
      // editable section of an element that isn't a void node (eg. a list item
      // of the check list example).
      const node = editor.findNode(relatedTarget)

      if (el != null && el.contains(relatedTarget) && node && !editor.isVoid(node)) {
        return
      }
    }

    debug('onBlur', { event })
    next()
  }

  /**
   * On composition end.
   *
   * @param {Event} event
   * @param {Editor} editor
   * @param {Function} next
   */

  function onCompositionEnd(event, editor, next) {
    isUserActionPerformed = true
    isComposing = false

    // Since we skipped all input events during the composition, once it is over
    // we need to manually call flush to sync the dom to the slate AST
    saveCurrentNativeNode(editor)
    syncDomToSlateAst(editor)

    debug('onCompositionEnd', { event })
    next()
  }

  /**
   * On click.
   *
   * @param {Event} event
   * @param {Editor} editor
   * @param {Function} next
   */

  function onClick(event, editor, next) {
    debug('onClick', { event })
    isUserActionPerformed = true
    next()
  }

  /**
   * On composition start.
   *
   * @param {Event} event
   * @param {Editor} editor
   * @param {Function} next
   */

  function onCompositionStart(event, editor, next) {
    isComposing = true

    const { value } = editor
    const { selection } = value
    isUserActionPerformed = true

    if (!selection.isCollapsed) {
      // https://github.com/ianstormtaylor/slate/issues/1879
      // When composition starts and the current selection is not collapsed, the
      // second composition key-down would drop the text wrapping <spans> which
      // resulted on crash in content.updateSelection after composition ends
      // (because it cannot find <span> nodes in DOM). This is a workaround that
      // erases selection as soon as composition starts and preventing <spans>
      // to be dropped.
      editor.delete()
    }

    saveCurrentNativeNode(editor)

    debug('onCompositionStart', { event })
    next()
  }

  /**
   * On copy.
   *
   * @param {Event} event
   * @param {Editor} editor
   * @param {Function} next
   */

  function onCopy(event, editor, next) {
    const window = getWindow(event.target)
    isCopying = true
    window.requestAnimationFrame(() => (isCopying = false))

    debug('onCopy', { event })
    next()
  }

  /**
   * On cut.
   *
   * @param {Event} event
   * @param {Editor} editor
   * @param {Function} next
   */

  function onCut(event, editor, next) {
    if (editor.readOnly) return

    const window = getWindow(event.target)
    isCopying = true
    window.requestAnimationFrame(() => (isCopying = false))

    debug('onCut', { event })
    next()
  }

  /**
   * On drag end.
   *
   * @param {Event} event
   * @param {Editor} editor
   * @param {Function} next
   */

  function onDragEnd(event, editor, next) {
    isDragging = false
    debug('onDragEnd', { event })
    next()
  }

  /**
   * On drag enter.
   *
   * @param {Event} event
   * @param {Editor} editor
   * @param {Function} next
   */

  function onDragEnter(event, editor, next) {
    debug('onDragEnter', { event })
    next()
  }

  /**
   * On drag exit.
   *
   * @param {Event} event
   * @param {Editor} editor
   * @param {Function} next
   */

  function onDragExit(event, editor, next) {
    debug('onDragExit', { event })
    next()
  }

  /**
   * On drag leave.
   *
   * @param {Event} event
   * @param {Editor} editor
   * @param {Function} next
   */

  function onDragLeave(event, editor, next) {
    debug('onDragLeave', { event })
    next()
  }

  /**
   * On drag over.
   *
   * @param {Event} event
   * @param {Editor} editor
   * @param {Function} next
   */

  function onDragOver(event, editor, next) {
    // If the target is inside a void node, and only in this case,
    // call `preventDefault` to signal that drops are allowed.
    // When the target is editable, dropping is already allowed by
    // default, and calling `preventDefault` hides the cursor.
    const node = editor.findNode(event.target)

    if (!node || editor.isVoid(node)) {
      event.preventDefault()
    }

    // COMPAT: IE won't call onDrop on contentEditables unless the
    // default dragOver is prevented:
    // https://developer.microsoft.com/en-us/microsoft-edge/platform/issues/913982/
    // (2018/07/11)
    if (IS_IE) {
      event.preventDefault()
    }

    // If a drag is already in progress, don't do this again.
    if (!isDragging) {
      isDragging = true

      // COMPAT: IE will raise an `unspecified error` if dropEffect is
      // set. (2018/07/11)
      if (!IS_IE) {
        event.nativeEvent.dataTransfer.dropEffect = 'move'
      }
    }

    debug('onDragOver', { event })
    next()
  }

  /**
   * On drag start.
   *
   * @param {Event} event
   * @param {Editor} editor
   * @param {Function} next
   */

  function onDragStart(event, editor, next) {
    isDragging = true
    debug('onDragStart', { event })
    next()
  }

  /**
   * On drop.
   *
   * @param {Event} event
   * @param {Editor} editor
   * @param {Function} next
   */

  function onDrop(event, editor, next) {
    if (editor.readOnly) return
    isUserActionPerformed = true

    // Prevent default so the DOM's value isn't corrupted.
    event.preventDefault()

    debug('onDrop', { event })
    next()
  }

  /**
   * On focus.
   *
   * @param {Event} event
   * @param {Editor} editor
   * @param {Function} next
   */

  function onFocus(event, editor, next) {
    if (isCopying) return
    if (editor.readOnly) return

    const el = editor.findDOMNode([])

    // Save the new `activeElement`.
    const window = getWindow(event.target)
    activeElement = window.document.activeElement

    // COMPAT: If the editor has nested editable elements, the focus can go to
    // those elements. In Firefox, this must be prevented because it results in
    // issues with keyboard navigation. (2017/03/30)
    if (IS_FIREFOX && event.target !== el) {
      el.focus()
      return
    }

    debug('onFocus', { event })
    next()
  }

  /**
   * On input.
   *
   * @param {Event} event
   * @param {Editor} editor
   * @param {Function} next
   */

  function onInput(event, editor, next) {
    if (isComposing) return

    // The input event fires after the browser has modified the dom
    // At this point we can read the dom to see what the browser did and import that change into slate's AST
    if (syncDomToSlateAst(editor)) {
      return
    }

    if (editor.value.selection.isBlurred) return
    isUserActionPerformed = true
    debug('onInput', { event })
    next()
  }

  /**
   * On key down.
   *
   * @param {Event} event
   * @param {Editor} editor
   * @param {Function} next
   */

  function onKeyDown(event, editor, next) {
    if (editor.readOnly) return

    // When composing, we need to prevent all hotkeys from executing while
    // typing. However, certain characters also move the selection before
    // we're able to handle it, so prevent their default behavior.
    if (isComposing) {
      if (Hotkeys.isCompose(event)) event.preventDefault()
      return
    }

    // Certain hotkeys have native editing behaviors in `contenteditable`
    // elements which will editor the DOM and cause our value to be out of sync,
    // so they need to always be prevented.
    if (
      !IS_IOS &&
      (Hotkeys.isBold(event) ||
        Hotkeys.isDeleteBackward(event) ||
        Hotkeys.isDeleteForward(event) ||
        Hotkeys.isDeleteLineBackward(event) ||
        Hotkeys.isDeleteLineForward(event) ||
        Hotkeys.isDeleteWordBackward(event) ||
        Hotkeys.isDeleteWordForward(event) ||
        Hotkeys.isItalic(event) ||
        Hotkeys.isRedo(event) ||
        // Hotkeys.isSplitBlock(event) ||
        Hotkeys.isTransposeCharacter(event) ||
        Hotkeys.isUndo(event))
    ) {
      event.preventDefault()
    }

    isUserActionPerformed = true
    debug('onKeyDown', { event })
    next()
  }

  /**
   * On paste.
   *
   * @param {Event} event
   * @param {Editor} editor
   * @param {Function} next
   */

  function onPaste(event, editor, next) {
    if (editor.readOnly) return
    isUserActionPerformed = true

    // Prevent defaults so the DOM state isn't corrupted.
    event.preventDefault()

    debug('onPaste', { event })
    next()
  }

  /**
   * On select.
   *
   * @param {Event} event
   * @param {Editor} editor
   * @param {Function} next
   */

  function onSelect(event, editor, next) {
    if (isCopying) return
    if (isComposing) return

    if (editor.readOnly) return

    // Save the new `activeElement`.
    const window = getWindow(event.target)
    activeElement = window.document.activeElement
    isUserActionPerformed = true

    debug('onSelect', { event })
    next()
  }

  function userActionPerformed() {
    return isUserActionPerformed
  }

  function clearUserActionPerformed() {
    isUserActionPerformed = false
    return null
  }

  /**
   * The job of this function is to look at the dom, see what text is there, and sync that text into slate.
   * We use this for things like asian language compositions, auto suggest/correct, and mac's accented character input.
   * Each of these are too complicated to replicate perfectly with the events the browser exposes to us.  Additionally,
   * the browser relies on us not modifying the text node.  If we touch the text node's content in any way, then the
   * browser will abort any composition that it has in progress!  So our goal is to let the browser do its things,
   * avoid touching it or syncing its state at all, and then once it is done, we will sync its state into slate,
   * which is what this function does.
   *
   * A slate AST will look something like this:
   * document: {
   *   nodes: [{
   *     type: 'line',
   *     nodes: [{key: '42', type: 'text', text: '**foo**'}],
   *   ]}
   * }
   *
   * The corresponding dom structure will look something like:
   * <span data-key=42>
   *   <span decoration="syntax">
   *     <span data-string=true>**</span>
   *   </span>
   *   <span decoration="bold">
   *     <span data-string=true>foo</span>
   *   </span>
   *   <span decoration="syntax">
   *     <span data-string=true>**</span>
   *   </span>
   * </span>
   *
   * The important thing to note about the above is that there is a single span tag that corresponds to each Text node
   * in the AST.  Generally speaking, thatSpanNode.textContent === LeaftAstTextNode.text
   *
   * The part where that is not true is zero-width spaces.  Slate needs to force text nodes to be created, and it does
   * this by creating dom nodes that just have a zero width space in them.  The problem with this is the browser doesn't
   * know that we don't want them.  So when a user types "a" to start, they will only see one character, but in the dom
   * there are actually two (because the browser didn't remove the zero-width space).  So, we have to do some surgery
   * on the dom to clean these up and keep them out of the slate AST.
   */

  function syncDomToSlateAst(editor) {
    const { nextNativeOperation } = editor.controller.tmp
    if (!nextNativeOperation || nextNativeOperation.length === 0) return false
    editor.controller.tmp.nextNativeOperation = null

    const {
      anchorNode: textNode,
      anchorOffset: currentOffset,
    } = window.getSelection()

    // Just in case: Make sure the currently selected node is in the list of nodes we are going to sync
    addCurrentlySelectedKeyNode(editor, nextNativeOperation)

    // Now sync the content of all nodes in the lis tinto our AST
    for (const node of nextNativeOperation) {
      sanitizeDomOnError(editor, node, () => syncNodeToSlateAst(editor, node))
    }

    // Finally make sure the browser and slate agree on where your selection should be
    sanitizeDomOnError(editor, textNode, () =>
      syncSelection(editor, textNode, currentOffset)
    )

    // Last step is more of a sanity thing: Make sure the dom structure and text roughly match what slate things they should!
    // This is normally called in the after plugin, however if we do that there, it will re-sync the selection, which we
    // just did above, which wastes about a millisecond.
    editor.reconcileDOMNode(textNode)
    return true
  }

  function syncNodeToSlateAst(editor, slateDomSpan) {
    // Re-read the slate span from the dom, _just in case_ it has been removed from the dom since!
    const key = slateDomSpan.getAttribute(DATA_ATTRS.KEY)
    slateDomSpan = findDomNode(key)

    const path = editor.value.document.getPath(key)
    const slateAstNode = editor.value.document.getNode(key)

    // Strip any zero-width spaces that slate uses internally.  React will clean these up too, but we are trying to
    // avoid having to react-render right now
    sanitizeZeroWidthSpaces(editor, slateDomSpan)

    // Now grab the full current text content of the slate dom node that represents the full slate AST node
    // We do need to strip any zero-width spaces though, since slate uses them for decorations and other things,
    // so they might legitimately need to be in the dom, but should never be in the AST
    const newTextContent = slateDomSpan.textContent.replace(/[\uFEFF]/g, '')
    syncTextToAst(editor, slateAstNode, path, newTextContent)
  }

  function syncSelection(editor, textNode, currentOffset) {
    // Now we need to go and update the selection.  First, we modify slate's internal representation of the selection:
    const newSelectionPosition = Math.min(
      textNode.textContent.length,
      currentOffset
    )
    // This maps a dom position to a slate position.  Remember above: A single slate node will have lots of child
    // dom nodes, which means the dom offset is usually going to be much different from what the offset is in the slate
    // AST
    const point = editor.findPoint(textNode, newSelectionPosition)
    if (point == null)
      throw Error('Unable to translate dom position to slate position!')
    setSlateSelection(editor, point.path, point.key, point.offset)

    // There's a good chance that slate will do nothing with the update above, partly because we have disabled selection
    // updates in some cases.  So, let's also force the browser to move the selection to where we want.
    // (IIRC in some cases slate was also moving the selection back to an old place sometimes, so this fixes that too).
    setDomSelection(textNode, newSelectionPosition)
  }

  /**
   * Intelligently syncs text changes to the slate AST.  If we can determine with confidence that all the user did
   * was insert a single letter or two, then there's a much faster code path we can take.  If we can't determine that,
   * then we'll replace the entire text content of the AST node, _but_ it will take an extra 2-3 ms
   */

  function syncTextToAst(editor, slateAstNode, path, newText) {
    const oldText = slateAstNode.text
    if (newText === oldText) return

    const key = slateAstNode.key

    // Look for the number of characters at the start and end of the two pieces of text that exactly match,
    // position for position.
    const numStartingCharsSame = commonCharactersAtStart(newText, oldText)
    const numEndingCharsSame = commonCharactersAtEnd(
      newText.substring(numStartingCharsSame),
      oldText.substring(numStartingCharsSame)
    )

    // Now, if the number of matching characters is the same as the length of the old text, then we know the new
    // text _only_ contains additions, and those additions start where the matching characters at the start stopped.
    if (numStartingCharsSame + numEndingCharsSame !== oldText.length) {
      // There is a deletion somewhere, so let's just replace the whole node's text
      editor.insertTextAtRange(
        Range.create({
          anchor: { path, key, offset: 0 },
          focus: { path, key, offset: slateAstNode.text.length },
        }),
        newText
      )
    } else {
      // We are _just_ inserting characters, so we can do a much faster AST operation!
      const insertions = newText.substring(
        numStartingCharsSame,
        newText.length - numEndingCharsSame
      )
      editor.insertTextByPath(path, numStartingCharsSame, insertions, null)
    }
  }

  /** Returns the number of continous characters that exactly match, starting at the beginning of the string */

  function commonCharactersAtStart(left, right) {
    for (let i = 0; i < left.length && i < right.length; i++) {
      if (left[i] !== right[i]) return i
    }
    return Math.min(left.length, right.length)
  }

  /** Returns the number of continous characters that exactly match, starting at the end of the string */

  function commonCharactersAtEnd(left, right) {
    const leftLength = left.length
    const rightLength = right.length

    for (let i = 0; i < leftLength && i < rightLength; i++) {
      if (left[leftLength - i - 1] !== right[rightLength - i - 1]) return i
    }
    return Math.min(leftLength, rightLength)
  }

  /** Syncs a new selection position to slate, but only if slate does not already have that position as its value */

  function setSlateSelection(editor, path, key, offset) {
    const { selection } = editor.value

    if (
      !selection.isCollapsed ||
      selection.anchor.key !== key ||
      selection.anchor.offset !== offset
    ) {
      const point = { path, key, offset }
      editor.select(Range.create({ anchor: point, focus: point }))
    }
  }

  /** Syncs a new selection position to the dom, but only if the dom does not already have that position */

  function setDomSelection(textNode, offset) {
    const selection = window.getSelection()

    if (
      selection == null ||
      selection.anchorNode !== textNode ||
      selection.focusNode !== textNode ||
      selection.anchorOffset !== offset ||
      selection.focusOffset !== offset
    ) {
      selection.collapse(textNode, offset)
    }
  }

  /**
   * Slate has two dom representations for leaf nodes:
   * <span data-string=true>abc</span>
   * <span data-zero-width=true></span>
   * When a node is first created, it starts as the zero-width dom node.  When we let the browser modify it, we will
   * be left with the zero-width markup, but it now contains more than just a zero-width string.  So, in this case,
   * we want to strip those attributes.
   * Additionally, if a node contains anything more than just a zero width string, then we should remove any zero-width
   * spaces from it if has any.
   */

  function sanitizeZeroWidthSpaces(editor, slateDomSpan) {
    const allChildTextNodes = slateDomSpan.querySelectorAll(
      `${SELECTORS.STRING}, ${SELECTORS.ZERO_WIDTH}`
    )

    for (const stringNode of allChildTextNodes) {
      const isStringNode = stringNode.hasAttribute(DATA_ATTRS.STRING)
      const isZeroWidth = stringNode.hasAttribute(DATA_ATTRS.ZERO_WIDTH)

      // This should basically always be true:
      if (isStringNode || isZeroWidth) {
        const hasZeroWidthChars = stringNode.textContent.indexOf('\uFEFF') >= 0

        // A string node with any zero width characters needs to be cleaned
        // A zero width node with only a zero width character is ok though:
        if (
          (isStringNode && hasZeroWidthChars) ||
          (isZeroWidth && stringNode.textContent !== '\uFEFF')
        ) {
          // Oof, sometimes slate adds empty br tags to the dom (see leaf.js), which leads to the code later getting
          // messed up :(  In this case though, we know the node _shouldn't_ have any, because it must have some
          // non-zero-width content, so we can just remove them.
          for (const childNode of stringNode.childNodes) {
            if (childNode.nodeType === 1 && childNode.tagName === 'BR') {
              stringNode.removeChild(childNode)
            }
          }

          // If there's only a single text node here, then we modify it's dom content directly
          // If there are multiple though, then it's a bit of an unknown situation, so we replace the entire span
          removeZeroWidths(stringNode)

          stringNode.removeAttribute(DATA_ATTRS.ZERO_WIDTH)
          stringNode.removeAttribute(DATA_ATTRS.LENGTH)
        }
      }
    }
  }

  function removeZeroWidths(parent) {
    eachTextNode(parent, textNode => {
      while (true) {
        const pos = textNode.textContent.indexOf('\uFEFF')
        if (pos === -1) break
        textNode.deleteData(pos, 1)
      }
    })
  }

  function eachTextNode(node, cb) {
    for (const child of node.childNodes) {
      if (child.nodeType === 1) {
        eachTextNode(child, cb)
      } else if (child.nodeType === 3) {
        cb(child)
      }
    }
  }

  function saveCurrentNativeNode(editor) {
    if (!editor.controller.tmp.nextNativeOperation) {
      editor.controller.tmp.nextNativeOperation = []
    }

    addCurrentlySelectedKeyNode(
      editor,
      editor.controller.tmp.nextNativeOperation
    )
  }

  function addCurrentlySelectedKeyNode(editor, keyNodes) {
    // The node with a data-key property entirely encompasses a single slate AST text node.
    // It'll have lots of children for the various decorations, but its entire textContent should map
    // to a single AST node
    const currentSpan = safelyGetParentKeyNode(window.getSelection().anchorNode)

    // Save a reference to the currently selected AST node
    // Once the browser has modified the dom, we'll use these to figure out what changes were made
    if (keyNodes.indexOf(currentSpan) === -1) {
      keyNodes.push(currentSpan)
    }
  }

  /**
   * Return the plugin.
   *
   * @type {Object}
   */

  return {
    onBeforeInput,
    onBlur,
    onClick,
    onCompositionEnd,
    onCompositionStart,
    onCopy,
    onCut,
    onDragEnd,
    onDragEnter,
    onDragExit,
    onDragLeave,
    onDragOver,
    onDragStart,
    onDrop,
    onFocus,
    onInput,
    onKeyDown,
    onPaste,
    onSelect,
    queries: { userActionPerformed },
    commands: { clearUserActionPerformed },
  }
}

/**
 * Export.
 *
 * @type {Function}
 */

export default BeforePlugin
