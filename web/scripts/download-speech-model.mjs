import { downloadModel } from './download-model.mjs'

const revision = '5332fcc35e32a33b86612b9a57a89be7906102b1'
const files = [
  ['config.json', 2248, 'dea913aa8ec7d53db029e97c97a766d534c8da04'],
  ['generation_config.json', 3716, '72e54ad7340e05287aa731f9d8556b5368be3fe0'],
  ['preprocessor_config.json', 339, '91876762a536a746d268353c5cba57286e76b058'],
  ['special_tokens_map.json', 2194, 'bf69932dca4b3719b59fdd8f6cc1978109509f6c'],
  ['tokenizer.json', 2480466, '1e95340ff836fad1b5932e800fb7b8c5e6d78a74'],
  ['tokenizer_config.json', 282683, 'd13b786c04765fb1a06492b53587752cd67665ea'],
  ['onnx/encoder_model_quantized.onnx', 10124910, 'fd9d995b9dcb0520f0dbf6cf68651af639fc385f594d9d876e69ca2802dc438e'],
  ['onnx/decoder_model_merged_quantized.onnx', 30727765, '6c0c125986b007d2e3734bec84c18bda0152071b90b87fadac6d7764499927a0'],
]

await downloadModel('Xenova/whisper-tiny', revision, files)
console.log('Offline speech model is ready.')
