import AppKit
import Foundation
// Package the existing brand for Apple's opaque 1024px application-icon slot.
let source = NSImage(contentsOfFile: CommandLine.arguments[1])!
let bitmap = NSBitmapImageRep(bitmapDataPlanes:nil,pixelsWide:1024,pixelsHigh:1024,bitsPerSample:8,samplesPerPixel:3,hasAlpha:false,isPlanar:false,colorSpaceName:.deviceRGB,bytesPerRow:0,bitsPerPixel:0)!
NSGraphicsContext.saveGraphicsState()
NSGraphicsContext.current = NSGraphicsContext(bitmapImageRep:bitmap)
NSColor(red:0.051,green:0.063,blue:0.098,alpha:1).setFill()
NSBezierPath(rect:NSRect(x:0,y:0,width:1024,height:1024)).fill()
source.draw(in:NSRect(x:0,y:0,width:1024,height:1024))
NSGraphicsContext.current?.flushGraphics()
NSGraphicsContext.restoreGraphicsState()
try bitmap.representation(using:.png,properties:[:])!.write(to:URL(fileURLWithPath:CommandLine.arguments[2]))
