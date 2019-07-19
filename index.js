var fs = require('fs')
const sharp = require('sharp')
var plist = require('plist')

var walkSync = function(dir, filelist) {
  var fs = fs || require('fs'),
      files = fs.readdirSync(dir);
  filelist = filelist || [];
  files.forEach(function(file) {
    if (fs.statSync(dir +'/' + file).isDirectory()) {
      filelist = walkSync(dir +'/' + file, filelist);
    }
    else {
      filelist.push(dir +'/' + file);
    }
  });
  return filelist;
}
// const allFile = walkSync(baseDir)
// fs.writeFileSync('allFile.json', JSON.stringify(allFile, null, 2))
// const resFiles = JSON.parse(fs.readFileSync('allFile.json'))

const baseDir = 'res'
// debugger
// fs.readdir(baseDir, (err, files)=> {
//   if (!err) {
//     handleAllFiles(files)
//   }
//   else {
//     debugger
//   }
  
// })

const handleAllFiles = files => {
  
}
// var walkSync = function(dir, filelist) {
//   var fs = fs || require('fs'),
//       files = fs.readdirSync(dir);
//   filelist = filelist || [];
//   files.forEach(function(file) {
//     if (fs.statSync(dir +'/' + file).isDirectory()) {
//       filelist = walkSync(dir +'/' + file, filelist);
//     }
//     else {
//       filelist.push(dir +'/' + file);
//     }
//   });
//   return filelist;
// }
// const allFile = walkSync(baseDir)
// fs.writeFileSync('allFile.json', JSON.stringify(allFile, null, 2))
const filterPlistFile = files => {
  const pListFiles = files.filter(item => { return item.indexOf('.plist') != -1 })
  const pngFiles = files.filter(item => { return item.indexOf('.png') != -1 })
  let result = []
  pListFiles.forEach(element => {
    const filePNG = element.substring(0, element.lastIndexOf('.plist')) + '.png'
    for (let i = 0; i < pngFiles.length; i++) {
      if (pngFiles[i] == filePNG) {
        result.push({
          plist: element,
          png: filePNG
        })
        break
      }
    }    
  });
  console.log('plistFile:', result)
  return result
}

const parsePListFile = file => {
  var obj = plist.parse(fs.readFileSync(file, 'utf8'));
  const frames = obj.frames
  const parseFrameInfo = frames => {
    let arrObj = []
    const fileNames = Object.keys(frames)
    for (let i = 0; i < fileNames.length; i++) {
      const fileName = fileNames[i];
      const { spriteSize, spriteSourceSize, textureRect, textureRotated } = frames[fileName]
      const size = getSize(spriteSize)
      const rectInfo = getOffsetAndSize(textureRect)
      arrObj.push({
        fileName,
        rectInfo,
        isRotated: textureRotated
      })
    }
    return arrObj;
  }
  const getSize = sizeText => {
    let start = sizeText.indexOf('{');
    let commaSeperator = sizeText.indexOf(',')
    let end = sizeText.indexOf('}')
    const width = Number(sizeText.substring(start+1, commaSeperator))
    const height =  Number(sizeText.substring(commaSeperator + 1, end))
    return {width, height}
  }
  const getOffsetAndSize = textureRect => {
    const arr = textureRect.split(',')
    const arrNumber = arr.map(item => Number(item.replace(/[\{\}]/g, "")));
    return {
      x: arrNumber[0],
      y: arrNumber[1],
      width: arrNumber[2],
      height: arrNumber[3]
    }
  }

  return parseFrameInfo(frames)
}
const doCreateFile = (parentFolder, bigImage, allFileNames, idx) => {
  if (idx < allFileNames.length) {
    const item  = allFileNames[idx]
    const {rectInfo} = item
    console.log("bigImage")
    sharp(bigImage).extract({ 
      width: item.isRotated?rectInfo.height:rectInfo.width,
      height: item.isRotated?rectInfo.width:rectInfo.height,
      left: rectInfo.x, 
      top: rectInfo.y
    }).rotate(item.isRotated?-90:0).toFile(parentFolder + item.fileName).then( fileInfo => {
        doCreateFile(parentFolder, bigImage, allFileNames, ++idx)
    }).catch(err => {
      console.log("error file:", err.message)
      debugger
    })
  }
}
const doAllthing = (allFiles) => {
  const allFile = filterPlistFile(allFiles)
  const buildEachFile = (allFile, idx) => {
    
    if (idx >= allFile.length ) {
      return
    }
    console.log("fileName:", allFile[idx].plist)
    const filePlist = allFile[idx]
    const indexSlash = filePlist.plist.lastIndexOf('/')
    if (indexSlash != -1) {
      const dirName = filePlist.plist.substring(0, indexSlash) + filePlist.plist.substring(indexSlash, filePlist.plist.length - 6 )
      fs.mkdir(dirName, { recursive: true }, e => {
        if (!e) {
          const allSeparateFile = parsePListFile(filePlist.plist)
          doCreateFile(dirName + '/', filePlist.png , allSeparateFile, 0)
          buildEachFile(allFile, ++idx)
        } else {
          if (e.code === 'EEXIST') {
            const allSeparateFile = parsePListFile(filePlist.plist)
            doCreateFile(indexSlash + '/',filePlist.png, allSeparateFile, 0)
            buildEachFile(allFile, ++idx)
          }
        }
      })
    } else {
      const allSeparateFile = parsePListFile(filePlist.plist)
      doCreateFile(indexSlash + '/', filePlist.png, allSeparateFile, 0)
      buildEachFile(allFile, ++idx)
    }
  }
  // for (let i = 0; i < allFile.length; i++) {
  //   const filePlist = allFile[i]
  //   const indexSlash = filePlist.lastIndexOf('/')
  //   if (indexSlash != -1) {
  //     const dirName = filePlist.substring(0, indexSlash)
  //     fs.mkdir(dirName, { recursive: true }, e => {
  //       if (!e) {
  //         const allSeparateFile = parsePListFile(filePlist.plist)
  //         doCreateFile(indexSlash + '/', allSeparateFile, 0)    
  //       } else {
  //         debugger
  //       }
  //     })
  //   } else {
  //     const allSeparateFile = parsePListFile(filePlist.plist)
  //     doCreateFile(indexSlash + '/', allSeparateFile, 0)      
  //   }    
  // }
  buildEachFile(allFile, 0)
}
// doAllthing()

if (!process.env.FILE_DIR) {
  throw Error("file must be plist or directory")
} else {
  const fileInput = process.env.FILE_DIR
  const startSync = fs.statSync(fileInput)
  console.log ("file input", fileInput)
  if (startSync.isFile()) {
    if (fileInput.indexOf('.plist') ==  -1) {
      throw Error ("File must be plist")
    } else {      
      const indexSlash = fileInput.lastIndexOf('/')
      const allSeparateFile = parsePListFile(fileInput)
      const dirName = fileInput.substring(0, indexSlash) + fileInput.substring(indexSlash, fileInput.length - 6 )
      fs.mkdir(dirName, err => {
        if (!err) {
          doCreateFile(dirName + '/', fileInput.substring(0, fileInput.length - 6 ) + '.png' , allSeparateFile, 0)
        }
      })
      
    }
  } else if (startSync.isDirectory()) {
    const allPlistFile = walkSync(fileInput)
    doAllthing(allPlistFile)
  }
}