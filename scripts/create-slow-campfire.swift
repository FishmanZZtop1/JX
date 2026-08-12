import CoreImage
import Foundation
import ImageIO
import UniformTypeIdentifiers

let arguments = CommandLine.arguments
guard arguments.count == 3 else {
  fputs("Usage: swift create-slow-campfire.swift <input.gif> <output.apng>\n", stderr)
  exit(2)
}

let inputURL = URL(fileURLWithPath: arguments[1]) as CFURL
let outputURL = URL(fileURLWithPath: arguments[2]) as CFURL

guard let source = CGImageSourceCreateWithURL(inputURL, nil) else {
  fputs("Unable to read the source GIF.\n", stderr)
  exit(3)
}

let sourceCount = CGImageSourceGetCount(source)
let firstSteadyFrame = min(6, max(0, sourceCount - 1))
let steadyFrameCount = sourceCount - firstSteadyFrame
let interpolationSteps = 3
let outputFrameCount = steadyFrameCount * interpolationSteps
let frameDelay = 0.048

guard
  steadyFrameCount > 1,
  let destination = CGImageDestinationCreateWithURL(
    outputURL,
    UTType.png.identifier as CFString,
    outputFrameCount,
    nil
  )
else {
  fputs("Unable to create the APNG destination.\n", stderr)
  exit(4)
}

let context = CIContext(options: [.cacheIntermediates: true])
let animationProperties: [CFString: Any] = [kCGImagePropertyAPNGLoopCount: 0]
let frameProperties: [CFString: Any] = [
  kCGImagePropertyAPNGDelayTime: frameDelay,
  kCGImagePropertyAPNGUnclampedDelayTime: frameDelay,
]

CGImageDestinationSetProperties(
  destination,
  [kCGImagePropertyPNGDictionary: animationProperties] as CFDictionary
)

func transparentFire(_ image: CGImage) -> CIImage {
  let sourceImage = CIImage(cgImage: image)
  guard let color = CIFilter(name: "CIColorControls") else { return sourceImage }
  color.setValue(sourceImage, forKey: kCIInputImageKey)
  color.setValue(1.08, forKey: kCIInputSaturationKey)
  color.setValue(1.03, forKey: kCIInputContrastKey)
  return (color.outputImage ?? sourceImage).cropped(to: sourceImage.extent)
}

for offset in 0..<steadyFrameCount {
  let currentIndex = firstSteadyFrame + offset
  let nextIndex = firstSteadyFrame + ((offset + 1) % steadyFrameCount)
  guard
    let currentImage = CGImageSourceCreateImageAtIndex(source, currentIndex, nil),
    let nextImage = CGImageSourceCreateImageAtIndex(source, nextIndex, nil)
  else {
    fputs("Unable to decode source frame \(currentIndex).\n", stderr)
    exit(5)
  }

  let current = transparentFire(currentImage)
  let next = transparentFire(nextImage)

  for interpolationIndex in 0..<interpolationSteps {
    let amount = Double(interpolationIndex) / Double(interpolationSteps)
    let outputImage: CIImage

    if interpolationIndex == 0 {
      outputImage = current
    } else if let dissolve = CIFilter(name: "CIDissolveTransition") {
      dissolve.setValue(current, forKey: kCIInputImageKey)
      dissolve.setValue(next, forKey: kCIInputTargetImageKey)
      dissolve.setValue(amount, forKey: kCIInputTimeKey)
      outputImage = dissolve.outputImage ?? current
    } else {
      outputImage = current
    }

    guard let rendered = context.createCGImage(outputImage, from: current.extent) else {
      fputs("Unable to render output frame.\n", stderr)
      exit(6)
    }

    CGImageDestinationAddImage(
      destination,
      rendered,
      [kCGImagePropertyPNGDictionary: frameProperties] as CFDictionary
    )
  }
}

guard CGImageDestinationFinalize(destination) else {
  fputs("Unable to finalize the APNG.\n", stderr)
  exit(7)
}

print("Created \(outputFrameCount) frames at \(frameDelay)s each (\(Double(outputFrameCount) * frameDelay)s total).")
