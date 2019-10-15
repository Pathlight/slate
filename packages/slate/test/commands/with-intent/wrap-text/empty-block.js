/** @jsx h */

import { h } from '../../../helpers'

export const run = editor => {
  editor.wrapText('[[', ']]')
}

export const input = (
  <value>
    
      <block>
        <cursor />
      </block>
    
  </value>
)

export const output = (
  <value>
    
      <block>
        [[<cursor />]]
      </block>
    
  </value>
)
