import { produce } from 'immer'
import { Change, Operation, Value } from '..'
import {
  DIRTY_PATHS,
  NORMALIZING,
  FLUSHING,
  PATH_REFS,
  POINT_REFS,
  RANGE_REFS,
} from './utils'
import AnnotationCommands from './commands/annotation'
import TextCommands from './commands/text'
import NodeCommands from './commands/node'
import MarkCommands from './commands/mark'
import SelectionCommands from './commands/selection'
import GeneralCommands from './commands/general'
import ElementQueries from './queries/element'
import GeneralQueries from './queries/general'
import LocationQueries from './queries/location'
import RangeQueries from './queries/range'
import ValueQueries from './queries/value'

/**
 * The `EditorConstructor` interface is provided as a convenience for plugins
 * who can use it when writing the typings for extending the `Editor` class.
 */

type EditorConstructor<E extends Editor = Editor> = new (...args: any[]) => E

/**
 * The `EditorMixin` interface is provided as a convenience for plugins
 * who can use it when writing the typings for their plugin functions.
 */

type EditorMixin<E extends Editor = Editor> = (
  Editor: EditorConstructor<E>
) => E

/**
 * The `EditorMixin` interface is provided as a convenience for plugins
 * who can use it when writing the typings for their plugin functions.
 */

type EditorPlugin<E extends Editor = Editor> = (
  ...args: any[]
) => EditorMixin<E>

/**
 * The `Editor` class stores all the state of a Slate editor. It is extended by
 * plugins that wish to add their own methods that implement new behaviors.
 */

class Editor {
  onChange: (change: Change) => void
  operations: Operation[]
  value: Value

  constructor(
    props: {
      onChange?(change: Change): void
      readOnly?: boolean
      value?: Value
    } = {}
  ) {
    const {
      onChange = () => {},
      value = produce(
        { nodes: [], selection: null, annotations: {} },
        () => {}
      ),
    } = props

    this.onChange = onChange
    this.operations = []
    this.value = value

    DIRTY_PATHS.set(this, [])
    FLUSHING.set(this, false)
    NORMALIZING.set(this, true)
    PATH_REFS.set(this, new Set())
    POINT_REFS.set(this, new Set())
    RANGE_REFS.set(this, new Set())
  }
}

interface Editor
  extends AnnotationCommands,
    TextCommands,
    NodeCommands,
    MarkCommands,
    SelectionCommands,
    GeneralCommands,
    ElementQueries,
    GeneralQueries,
    LocationQueries,
    RangeQueries,
    ValueQueries {}

const mixin = (Mixins: Array<new () => any>) => {
  for (const Mixin of Mixins) {
    for (const key of Object.getOwnPropertyNames(Mixin.prototype)) {
      if (key !== 'constructor') {
        Editor.prototype[key] = Mixin.prototype[key]
      }
    }
  }
}

mixin([
  AnnotationCommands,
  TextCommands,
  NodeCommands,
  MarkCommands,
  SelectionCommands,
  GeneralCommands,
  ElementQueries,
  GeneralQueries,
  LocationQueries,
  RangeQueries,
  ValueQueries,
])

export { Editor, EditorConstructor, EditorMixin, EditorPlugin }