/**
 * Runtime Hub - Port Definitions
 * Maps each node type to its named input/output ports by index.
 * portIndex 0 = first entry in each array. Mirrors node-library.js definitions.
 */

// Ports that establish execution order only and carry no data to downstream inputs.
// resolveInputs skips connections whose source output port name is in this set.
const CONTROL_FLOW_OUTPUT_PORTS = new Set([
    'main', 'item', 'loop_complete', 'completed', 'shown', 'logged', 'sent'
]);

const NODE_PORT_MAP = {
    'Start':            { inputs: [],                                       outputs: ['main'] },
    'End':              { inputs: ['main'],                                  outputs: [] },
    'Condition':        { inputs: ['condition', 'true_path', 'false_path'],  outputs: ['true', 'false'] },
    'Loop':             { inputs: ['input', 'loop_body'],                    outputs: ['item', 'loop_complete'] },
    'Delay':            { inputs: ['duration'],                              outputs: ['completed'] },
    'Wait':             { inputs: ['duration'],                              outputs: ['completed'] },
    'Execute Python':   { inputs: ['code', 'args'],                          outputs: ['result', 'error'] },
    'Monitor Function': { inputs: ['function_name', 'trigger'],              outputs: ['execution_data', 'error'] },
    'Import Module':    { inputs: ['module_name'],                           outputs: ['module', 'error'] },
    'List Directory':   { inputs: ['directory_path'],                        outputs: ['files', 'directories', 'error'] },
    'Start Process':    { inputs: ['executable', 'args'],                    outputs: ['process_id', 'error'] },
    'Kill Process':     { inputs: ['process_id', 'force'],                   outputs: ['success', 'error'] },
    'HTTP Request':     { inputs: ['url', 'method', 'body'],                 outputs: ['response', 'status_code', 'error'] },
    'Download File':    { inputs: ['url', 'save_path'],                      outputs: ['file_path', 'size', 'error'] },
    'Transform JSON':   { inputs: ['data', 'transformation'],                outputs: ['result', 'error'] },
    'Parse Text':       { inputs: ['text', 'pattern'],                       outputs: ['matches', 'error'] },
    'SQL Query':        { inputs: ['query', 'parameters'],                   outputs: ['results', 'error'] },
    'Show Message':     { inputs: ['title', 'message'],                      outputs: ['shown', 'error'] },
    'Write Log':        { inputs: ['level', 'message'],                      outputs: ['logged', 'error'] },
    'Keyboard Input':   { inputs: ['keys', 'target'],                        outputs: ['sent', 'error'] },
    'Encrypt Data':     { inputs: ['data', 'key'],                           outputs: ['encrypted', 'error'] },
    'Screenshot':       { inputs: ['trigger'],                               outputs: ['image', 'error'] },
    'HTML Snapshot':    { inputs: ['url'],                                   outputs: ['html', 'error'] },
    'CSS Inject':       { inputs: ['trigger'],                               outputs: ['result', 'error'] },
    'Image Resize':     { inputs: ['imagePath'],                             outputs: ['outputPath', 'error'] },
    'Color Picker':     { inputs: ['imagePath'],                             outputs: ['colors', 'error'] },
};

module.exports = { NODE_PORT_MAP, CONTROL_FLOW_OUTPUT_PORTS };
