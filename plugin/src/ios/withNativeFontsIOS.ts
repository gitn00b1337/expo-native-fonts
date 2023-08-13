import { ConfigPlugin, ExportedConfigWithProps, XcodeProject, withDangerousMod, withInfoPlist, withXcodeProject } from "@expo/config-plugins"
import { ExpoNativeFontOptions, ExpoNativeFontsOptions } from ".."
import * as path from "path"
import { ExpoConfig } from "@expo/config-types"
import { sanitizedName } from "@expo/config-plugins/build/ios/utils/Xcodeproj"
import fsExtra from "fs-extra"

const getIOSFonts = (options: ExpoNativeFontsOptions) => {
    return options.fonts.filter(f => f.platform !== 'android')
}

type FontsGrouped = {
    [targetId: string]: ExpoNativeFontOptions[]
}

const groupByTarget = (fonts: ExpoNativeFontOptions[]) => {
    let groupedFonts: FontsGrouped = {}

    for (const font of fonts) {
        const {
            targets,
        } = font

        if (!targets) {
            throw new Error(`Targets is required for iOS font ${font.name || font.filePath}`)
        }

        for (const target of targets) {
            groupedFonts[target] = [
                ...(groupedFonts[target] || []),
                font,
            ]
        }
    }

    return groupedFonts
}

const updateXcodeProject = (config: ExportedConfigWithProps<XcodeProject>, options: ExpoNativeFontsOptions, grouped: FontsGrouped) => {
    const targets = Object.keys(grouped)

    copyFontFiles(config, options)

    for (const target of targets) {
        const fonts = grouped[target]
        addFontToXcodeProj(config, options, target, fonts)
    }

    return config
}

const getFontName = ({ name, filePath }: ExpoNativeFontOptions) => {
    if (name) {
        return name
    }

    const ext = path.extname(filePath)
    return path.basename(filePath).replace(ext, "")
}

const getPBXTargetByName = (project: XcodeProject, name: string) => {
    var targetSection = project.pbxNativeTargetSection()

    for (const uuid in targetSection) {
        const target = targetSection[uuid]
        
        if (target.name === name) {
            return {
                uuid,
                target,
            }
        }    
    }

    return { target: null, uuid: null }
}

const addFontToXcodeProj = (config: ExportedConfigWithProps<XcodeProject>, options: ExpoNativeFontsOptions, targetName: string, fonts: ExpoNativeFontOptions[]) => {
    console.log(`Adding fonts to target ${targetName}`)
    const {
        projectRoot,
    } = config.modRequest

    const project = config.modResults;
    // const targetDirectory = path.join(projectRoot, targetName)
    // console.log(`Target directory: ${targetDirectory}`)

    const fontFiles = fonts.map(font => font.filePath)
    console.log('Font files:')
    console.log(fontFiles)

    const groupName = 'Fonts'
    const groupPath = 'Fonts'

    console.log(`Adding ${groupName} pbx group`)
    const pbxGroup = project.addPbxGroup(
        [...fontFiles],
        groupName,
        groupPath,
        '"<group>"'
    )

    // add to main project group
    const projectInfo = project.getFirstProject()
    const mainGroup = projectInfo.firstProject.mainGroup
    console.log(`Adding pbx group to main group ${mainGroup}`)
    project.addToPbxGroup(pbxGroup.uuid, mainGroup)

    // add file to the targets build phase
    console.log(`Searching for target ${targetName}`)
    const { target, uuid: targetUuid } = getPBXTargetByName(project, targetName)

    if (!target || !targetUuid) {
        throw new Error(`expo-native-fonts:: cannot find target ${targetName}. Has the target been set up correctly?`)
    }

    console.log(`Target UUID: ${targetUuid}`)

    const resourceBuildPhases = project.pbxResourcesBuildPhaseObj(targetUuid)


    // this causes multiple resource phases which can cause build issues
    // project.addBuildPhase(
    //     [...fontFiles],
    //     "PBXResourcesBuildPhase",
    //     groupName,
    //     targetUuid,
    //     'app_extension',
    //     ''
    // )
    for (const file of fontFiles) {
        project.addResourceFile(file, {
            lastKnownFileType: 'file',
            sourceTree: '<group>',
            target: targetUuid,
        }, 'Resources')
    }

    return config
}

const updateInfoPlist = (config: ExportedConfigWithProps<XcodeProject>, options: ExpoNativeFontsOptions, grouped: FontsGrouped) => {
    const {
        projectRoot,
    } = config.modRequest

    console.log('Updating Info.plist files')

    for (const targetName in grouped) {
        const targetFonts = grouped[targetName]
        const plistFilePath = path.join(projectRoot, 'ios', targetName, 'Info.plist')
        console.log(`plistFilePath: ${plistFilePath}`)

        if (!fsExtra.existsSync(plistFilePath)) {
            throw new Error(`There is no Info.plist file at ${plistFilePath}. You must ensure your target has a Info.plist file to add fonts.`)
        }
        
        const contents = fsExtra.readFileSync(plistFilePath, 'utf-8')
        const dictTag = '<dict>'
        const dictIndex = contents.indexOf(dictTag)

        console.log(contents)
        console.log(`dictIndex: ${dictIndex}`)
        
        if (dictIndex === -1) {
            throw new Error(`Your Info.plist file at ${plistFilePath} does not have a <dict>. Please add this to your file.`)
        }

        const insertIndex = dictIndex + dictTag.length
        
        const insertionKeys = targetFonts.reduce((contents, { filePath }) => {
            const name = path.basename(filePath)

            return `${contents}
            <string>${name}</string>`
        }, '')

        const insertionContents = `<key>UIAppFonts</key>
        <array>
        ${insertionKeys}
        </array>`

        const newPlistContents = contents.slice(0, insertIndex) + insertionContents + contents.slice(insertIndex)
        fsExtra.writeFileSync(plistFilePath, newPlistContents)
    }

    return config
}

const copyFontFiles = (config: ExportedConfigWithProps<XcodeProject>, { srcFolder }: ExpoNativeFontsOptions) => {
    const {
        projectRoot,
    } = config.modRequest

    console.log(`Copying files`)
    const sourceDir = path.join(projectRoot, srcFolder)
    const targetDir = path.join(projectRoot, 'ios', 'Fonts')

    console.log(`SourceDir: ${sourceDir}`)
    console.log(`TargetDir: ${targetDir}`)

    if (!fsExtra.lstatSync(sourceDir).isDirectory()) {
        throw new Error(`The provided sourceDir is not a directory. This value must be the directory of your font files.`)
    }

    if (!fsExtra.existsSync(targetDir)) {
        fsExtra.mkdirSync(targetDir, { recursive: true });
    }

    fsExtra.copySync(sourceDir, targetDir)
    console.log(`Font files copied to ios/Fonts`)
}

/**
 * This is the plugin entry method
 * @param config 
 * @param options 
 * @returns 
 */
export const withExpoNativeFontsIOS: ConfigPlugin<ExpoNativeFontsOptions> = (config, options) => {
    return withXcodeProject(config, (config) => {
        return injectExpoNativeFontsIOS(config, options)
    }) 
}

/**
 * This is the entry other modules
 * @param config 
 * @param options 
 * @returns 
 */
export const injectExpoNativeFontsIOS = (config: ExportedConfigWithProps<XcodeProject>, options: ExpoNativeFontsOptions) => {
    const iosFonts = getIOSFonts(options)
    const grouped = groupByTarget(iosFonts)

    updateInfoPlist(config, options, grouped)
    updateXcodeProject(config, options, grouped)

    return config
}