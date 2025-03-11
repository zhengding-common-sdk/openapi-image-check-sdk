# toaddit-openapi-image-upload-sdk

The customizer supports **RGB color mode**, **sRGB color standard**, and **PNG, JPG, JPEG** image formats.  
This SDK verifies images by checking their color mode, color profile, and format to filter out abnormal images, ensuring compatibility with the customizer.

## Installation

### Install via npm

```bash
npm install toaddit-openapi-image-upload-sdk
```

### Install via yarn

```bash
yarn add toaddit-openapi-image-upload-sdk
```

## Usage

### Browser Import

Download dist/main.js and include it in your project.
A global variable ToadditOpenapiImageUploadSdk will be available on window:

```js
<script src="./main.js"></script>

<script>
  const { batchOriginImageValidator } = ToadditOpenapiImageUploadSdk;
  const files = []; // Uploaded image files
  batchOriginImageValidator(files, true).then(res => {
  console.log('Verification result:', res);
});
</script>

```

### ES Modules Import

```js
import { batchOriginImageValidator } from 'toaddit-openapi-image-upload-sdk';

const files = []; // Uploaded image files
batchOriginImageValidator(files, true).then(res => {
  console.log('Verification result:', res);
});
```

### CommonJS Import

```js
const { batchOriginImageValidator } = require('toaddit-openapi-image-upload-sdk');

const files = []; // Uploaded image files
batchOriginImageValidator(files, true).then(res => {
  console.log('Verification result:', res);
});
```

## Live Demo

[View Example](https://toaddit.github.io/toaddit-openapi-image-upload-sdk/example/index.html)

### API Documentation

#### ToadditOpenapiImageUploadSdk.batchOriginImageValidator

| Parameter | Type | Required | Default | Description                    |
|-----------|-----------------------------------------------------------------------------------------|--------|---|--------------------------------|
| files     | File[]  | ✔️ | null | Array of image files to verify |
| format    | boolean | ❌ | false | false                          | Auto-convert invalid images to RGB/sRGB (may cause color shifts). Manual conversion with Photoshop is recommended |

#### Response Structure
| Property | Type    | Description  |
|----------|---------|--------|
| code     | number | 0 = success, 1 = failure |
| data     | object[] | Array of verification results ([see Data Schema](#data-schema))  |
| errList  | string[] | List of error details  |
| errMsg   | string | Concatenated error messages |

#### Data Schema

| Field  | Type                        | Description                       |
|--------|---------------------------|-----------------------------------|
| file | File | Original image file               |
| formatFile | File | Converted image file (if format=true) |
| errMsg | string | Verification error message        |
| item | object | Image instance data               |

## License

MIT &copy;
