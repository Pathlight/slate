/** @jsx jsx */

import { jsx } from '../../../helpers'

export const run = editor => {
  editor.insertText('a few words')
}

export const input = (
  <value>
    
      <block>
        <cursor />word
      </block>
    
  </value>
)

export const output = (
  <value>
    
      <block>
        a few words<cursor />word
      </block>
    
  </value>
)