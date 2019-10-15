/** @jsx h */

import { h } from '../../../helpers'

export const run = editor => {
  editor.deleteWordForward()
}

export const input = (
  <value>
    
      <block>
        <cursor />one two three
      </block>
    
  </value>
)

export const output = (
  <value>
    
      <block>
        <cursor /> two three
      </block>
    
  </value>
)
