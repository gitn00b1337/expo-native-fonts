import { ConfigPlugin } from "@expo/config-plugins"
import { withExpoNativeFontsIOS } from "./ios/withNativeFontsIOS"

export type ExpoNativeFontOptions = {
    /**
     * The relative file path from the base fonts folder.
     */
    filePath: string
    /**
     * The iOS targets this font is for.
     */
    targets: string[]
    /**
     * [optional] The name of the font for the Info.plist file. If not provided, the file basename is used.
     */
    name?: string
    /**
     * Which platforms to install this font for.
     */
    platform: 'ios' | 'android' | 'both'
}

export type ExpoNativeFontsOptions = {
    /**
     * The folder your font files are within. Each font can be in a subdirectory of this base folder if you wish.
     */
    srcFolder: string
    /**
     * The fonts to install in iOS and android.
     */
    fonts: ExpoNativeFontOptions[]
}

const validateOptions = (options: ExpoNativeFontsOptions) => {
    if (!options.srcFolder) {
        throw new Error(`expo-native-fonts:: srcFolder is required.`)
    }

    if (!options.fonts) {
        throw new Error(`expo-native-fonts:: fonts[] is required.`)
    }

    validateFonts(options.fonts)
}

const validateFonts = (fonts: ExpoNativeFontOptions[]) => {
    for (let i = 0; i < fonts.length; i++) {
        const font = fonts[i]

        if (!font.filePath) {
            throw new Error(`expo-native-fonts:: fonts[${i}].srcFolder is required.`)
        }
    
        if (!font.platform) {
            throw new Error(`expo-native-fonts:: fonts[${i}].platform is required.`)
        }
    
        if (!font.targets) {
            throw new Error(`expo-native-fonts:: fonts[${i}].targets is required.`)
        }
    }
}

const withExpoNativeFonts: ConfigPlugin<ExpoNativeFontsOptions> = (config, options) => {
    validateOptions(options)
    config = withExpoNativeFontsIOS(config, options)   
    return config
}

export default withExpoNativeFonts