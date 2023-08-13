# expo-native-fonts

This module is for adding custom fonts to native iOS extensions, for example if you use my expo-widgets project.

To add fonts, simply create a folder and drop iOS compatible fonts (e.g. ttf files) in there. Then add the following to your expo app.config.(ts/js) plugins array:

```
"@bittingz/expo-native-fonts",
    {
        "srcFolder": "./fonts",
            "fonts": [
            {
                "filePath": "Montserrat/Montserrat-Bold.ttf",
                "targets": [
                "expowidgetsWidgetExtension"
                ],
                "platform": "ios"
            }
            ]
    }
```

srcFolder should relative path from your project root to the fonts folder.
fonts is an array of fonts to inject

Each item of fonts must have the file path, the target it is to be injected into and the platform. Android is not yet supported.