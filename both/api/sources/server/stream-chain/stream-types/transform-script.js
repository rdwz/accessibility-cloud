import { check } from 'meteor/check';
import { SimpleSchema } from 'meteor/aldeed:simple-schema';
import vm from 'vm';
import vmScriptsOptions from './vm-scripts-options';

const { Transform } = Npm.require('zstreams');

function compileMappingFunction(javascript, context, onDebugInfo) {
  try {
    const code = `(d) => (${javascript})`;

    return vm.runInContext(code, context, vmScriptsOptions);
  } catch (error) {
    onDebugInfo({
      compilationError: [
        'JavaScript compilation error:',
        error,
        error.stack,
        error.reason,
        error.message,
      ].join('\n'),
    });
    return () => {};
  }
}

export default class TransformScript {
  constructor({
    javascript,
    onDebugInfo = () => {},
  }) {
    check(javascript, String);

    const globalObject = Object.freeze({});
    const context = this.context = vm.createContext(globalObject);
    const compiledScript = compileMappingFunction(javascript, context, onDebugInfo);

    this.stream = new Transform({
      writableObjectMode: true,
      readableObjectMode: true,
      transform(data, encoding, callback) {
        const output = compiledScript(data);

        callback(null, output);
        return null;
      },
    });

    this.lengthListener = length => this.stream.emit('length', length);
    this.pipeListener = source => {
      this.source = source;
      source.on('length', this.lengthListener);
    };
    this.stream.on('pipe', this.pipeListener);

    this.stream.unitName = 'objects';
  }

  dispose() {
    if (this.stream) {
      if (this.pipeListener) {
        this.stream.removeListener('pipe', this.pipeListener);
      }
      delete this.stream;
    }
    if (this.pipeListener) {
      delete this.pipeListener;
    }
    if (this.source) {
      if (this.lengthListener) {
        this.source.removeListener('length', this.lengthListener);
      }
      delete this.source;
    }
    if (this.lengthListener) {
      delete this.lengthListener;
    }
    delete this.compiledScript;
    delete this.context;
  }

  static getParameterSchema() {
    return new SimpleSchema({});
  }
}
