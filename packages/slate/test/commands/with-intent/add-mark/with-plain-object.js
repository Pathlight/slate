/** @jsx h */

import { h } from '../../../helpers'

export const run = editor => {
  editor.addMark({
    type: 'bold',
    data: { thing: 'value' },
  })
}

export const input = (
  <value>
    
      <block>
        <anchor />w<focus />ord
      </block>
    
  </value>
)

export const output = (
  <value>
    
      <block>
        <b thing="value">
          <anchor />w
        </b>
        <focus />ord
      </block>
    
  </value>
)
