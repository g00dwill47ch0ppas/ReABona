import { downloadModel } from './download-model.mjs'

const revision = 'b75f4e52949639c3bb0b96546ea4149482f6e7ef'
const files = [
  ['config.json', 583, '4971855db5117b25c7ef85fb0f6cdec8431dbbfc'],
  ['preprocessor_config.json', 576, '363967130d243d9ed11bc99fe4402daa05643aba'],
  ['special_tokens_map.json', 460, 'ae0c5be6f35217e51c4c000fd325d8de0294e99c'],
  ['tokenizer.json', 2224253, '858f2e1fa8fe35b0f465b25c307b76537e4c825e'],
  ['tokenizer_config.json', 925, 'b00bb6fb6ffaf6191cba273986e041a2113e8ccd'],
  ['merges.txt', 524619, '76e821f1b6f0a9709293c3b6b51ed90980b3166b'],
  ['vocab.json', 862328, '182766ce89b439768edadda342519f33802f5364'],
  ['onnx/model_quantized.onnx', 155431700, '06af49bd5db977936bcddad2b45d0031072673517579d15b8cb42bf015a94156'],
]

await downloadModel('Xenova/owlvit-base-patch32', revision, files)
console.log('Offline photo model is ready.')
