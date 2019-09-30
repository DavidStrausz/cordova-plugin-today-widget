//
//  NowButton.swift
//  NowWidget
//
//  Created by Triggi on 24-01-17.
//
//

import UIKit

public func drawButton(_ view: UIView, _ position: Int, _ color: UIColor, _ title: String!) -> UIButton! {
	let buttonsPerRow = 6.0
	let spacing = 8.0

	let viewWidth = Double(view.frame.width)
	let marginLeft = Double(view.layoutMargins.left)
	let marginRight = Double(view.layoutMargins.right)
	let marginTop = 15.0

	let totalSpacing = spacing * (buttonsPerRow - 1)
	let containerWidth = viewWidth - marginLeft - marginRight

	let row = floor(Double(position) / buttonsPerRow)
	let positionOnRow = Double(position) - (row * buttonsPerRow)
	let width = (containerWidth - totalSpacing) / buttonsPerRow
	let height = width
	let x = marginLeft + (Double(positionOnRow) * width) + (Double(positionOnRow) * spacing)
	let y = marginTop + (110 * row)

	let button = UIButton(frame: CGRect(x: x, y: y, width: width, height: height))

	button.backgroundColor = color

	button.layer.cornerRadius = CGFloat(width / 2)
	//	button.layer.borderWidth = 1.5
	//	button.layer.borderColor = UIColor.whiteColor().CGColor
	//	button.layer.shadowColor = UIColor.blackColor().CGColor
	//	button.layer.shadowOffset = CGSizeMake(0, 1)
	//	button.layer.shadowRadius = 1
	//	button.layer.shadowOpacity = 0.5
	//	button.layer.shadowPath = UIBezierPath(roundedRect: button.bounds, cornerRadius: CGFloat(width / 2)).CGPath

	button.setImage(UIImage(named: "notification_icon.png")?.maskWithColor(hexStringToUIColor(hex: "#ffffff")), for: UIControl.State())
	button.setTitle(title, for: UIControl.State())
	button.adjustsImageWhenHighlighted = false;

	let iconMargin: CGFloat = 5.0
	let titleSpacing: CGFloat = 5.0

    var titleEdgeInsets = UIEdgeInsets.init();
    
    if #available(iOS 13.0, *) {
        let imageSize = button.imageView!.image!.size
        let frameSize = button.imageView!.frame
        titleEdgeInsets = UIEdgeInsets.init(top: 0.0, left: -(frameSize.width - 2*titleSpacing), bottom: -(imageSize.height - titleSpacing), right: 0.0)
    } else {
        let imageSize = button.imageView!.image!.size
        titleEdgeInsets = UIEdgeInsets.init(top: 0.0, left: -imageSize.width, bottom: -(imageSize.height - titleSpacing), right: 0.0)
    }
	let imageEdgeInsets = UIEdgeInsets.init(top: iconMargin, left: iconMargin, bottom: iconMargin, right: iconMargin);

	button.imageEdgeInsets = imageEdgeInsets
	button.titleEdgeInsets = titleEdgeInsets

	button.titleLabel?.font = UIFont.systemFont(ofSize: 11.0)
	button.titleLabel?.lineBreakMode = NSLineBreakMode.byTruncatingTail
	button.titleLabel?.numberOfLines = 2
	button.titleLabel?.textAlignment = NSTextAlignment.center
	button.setTitleColor(primaryColor(), for: UIControl.State())

	button.tag = position;

	return button
}

extension UIColor {
	func darkerColor(_ amount: CGFloat) -> UIColor {
		let rgba = UnsafeMutablePointer<CGFloat>.allocate(capacity: 4)

		self.getRed(&rgba[0], green: &rgba[1], blue: &rgba[2], alpha: &rgba[3])
		let darkerColor = UIColor(red: amount*rgba[0], green: amount*rgba[1], blue: amount*rgba[2], alpha: rgba[3])

        rgba.deinitialize(count:4)
		rgba.deallocate()
		return darkerColor
	}
}

func hexStringToUIColor (hex:String) -> UIColor {
	var cString:String = hex.trimmingCharacters(in: .whitespacesAndNewlines).uppercased()

	if (cString.hasPrefix("#")) {
		cString.remove(at: cString.startIndex)
	}

	if ((cString.count) != 6) {
		return UIColor.gray
	}

	var rgbValue:UInt32 = 0
	Scanner(string: cString).scanHexInt32(&rgbValue)

	return UIColor(
		red: CGFloat((rgbValue & 0xFF0000) >> 16) / 255.0,
		green: CGFloat((rgbValue & 0x00FF00) >> 8) / 255.0,
		blue: CGFloat(rgbValue & 0x0000FF) / 255.0,
		alpha: CGFloat(1.0)
	)
}

func primaryColor() -> UIColor {
	if #available(iOS 10.0, *) {
		return UIColor.darkText
	} else {
		return UIColor.lightText
	}
}

extension UIImage {
	func maskWithColor(_ color: UIColor) -> UIImage? {

		let maskImage = self.cgImage
		let width = self.size.width
		let height = self.size.height
		let bounds = CGRect(x: 0, y: 0, width: width, height: height)

		let colorSpace = CGColorSpaceCreateDeviceRGB()
		let bitmapInfo = CGBitmapInfo(rawValue: CGImageAlphaInfo.premultipliedLast.rawValue)
		let bitmapContext = CGContext(data: nil, width: Int(width), height: Int(height), bitsPerComponent: 8, bytesPerRow: 0, space: colorSpace, bitmapInfo: bitmapInfo.rawValue) //needs rawValue of bitmapInfo

		bitmapContext!.clip(to: bounds, mask: maskImage!)
		bitmapContext!.setFillColor(color.cgColor)
		bitmapContext!.fill(bounds)

		//is it nil?
		if let cImage = bitmapContext!.makeImage() {
			let coloredImage = UIImage(cgImage: cImage)

			return coloredImage

		} else {
			return nil
		}
	}
}
