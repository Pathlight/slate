/** @jsx h */

import { h } from '../../../helpers'

export const run = editor => {
  editor.deleteForward()
}

export const input = (
  <value>
    <block>
      one<inline>two</inline>
      <cursor />a
    </block>
  </value>
)

export const output = (
  <value>
    <block>
      one<inline>
        two
        <cursor />
      </inline>
    </block>
  </value>
)
