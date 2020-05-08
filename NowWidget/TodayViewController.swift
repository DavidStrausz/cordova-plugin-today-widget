//
//  TodayViewController.swift
//  NowWidget
//
//  Created by Triggi on 23-01-17.
//
//

import UIKit
import NotificationCenter

class TodayViewController: UIViewController, NCWidgetProviding {

    fileprivate var sharedData: SharedData?
	fileprivate var drawnButtons: Array<UIButton> = []

	@IBOutlet weak var spinner: UIActivityIndicatorView!
	@IBOutlet weak var appButton: UIButton!
	@IBAction func openApp(_ sender: AnyObject) {
		print("Should open Olisto...")
		extensionContext?.open(URL(string: "triggi://buttons")!, completionHandler: nil)
	}

	func loadData() -> Void {
        spinner.startAnimating();
        sharedData = loadSharedData()
        if sharedData == nil || !sharedData!.isDefined() {
            print("Missing data")
            setButtonTitle("Not logged in. Open Olisto to continue.")
            return
        }

		if !sharedData!.hasButtons() {
			print("No buttons configured")
			setButtonTitle("No buttons configured. Open Olisto to continue.")
            return
		}

		NSLog("Data initialized. \nServer baseURL: \n\(sharedData!.baseUrl!), \ntoken: \n\(sharedData!.token!),\nuuid: \n\(sharedData!.phoneId!)");
	}

	func setButtonTitle(_ message: String) {
		spinner.stopAnimating()
		appButton.setTitle(message, for: UIControl.State())
	}

   @objc func buttonAction(_ sender: UIButton!) {
		print("Button \(sender.tag) was pressed")
		let url = "\(sharedData!.baseUrl!)/channel/triggi-buttons/push/\(sharedData!.buttons[sender.tag].id)"
		postCall(url, token: sharedData!.token!, completionHandler: {(statusCode: Int?) -> () in
			print("Call executed with status code: \(statusCode!)")
		})
		buttonActivated(sender)
	}

	func drawOverlay(_ sender: UIButton!) -> CAShapeLayer {
		let circlePath = UIBezierPath(arcCenter: sender.imageView!.center, radius: sender.frame.size.width/2, startAngle: CGFloat(0), endAngle:CGFloat(Double.pi * 2), clockwise: true)
		let shapeLayer = CAShapeLayer()
		shapeLayer.path = circlePath.cgPath
		shapeLayer.fillColor = hexStringToUIColor(hex: sharedData!.buttons[sender.tag].color).darkerColor(0.3).cgColor
		shapeLayer.opacity = 0.7
		return shapeLayer
	}

	func buttonActivated(_ sender: UIButton!) {
		let overlay = drawOverlay(sender)
		UIView.transition(with: self.view, duration: 0.5, options: .transitionCrossDissolve, animations: {
			sender.layer.addSublayer(overlay)
		}, completion: {
			(value: Bool) in
			UIView.transition(with: self.view, duration: 1.0, options: .transitionCrossDissolve, animations: {
				overlay.removeFromSuperlayer()
			}, completion: nil)
		})
	}

	@objc func touchUp(_ sender: UIButton!) {
        sender.backgroundColor = hexStringToUIColor(hex: sharedData!.buttons[sender.tag].color)
		sender.setImage(UIImage(named: "notification_icon.png")?.maskWithColor(hexStringToUIColor(hex: "#ffffff")), for: UIControl.State())
	}

	@objc func touchDown(_ sender: UIButton!) {
        sender.backgroundColor = hexStringToUIColor(hex: sharedData!.buttons[sender.tag].color).darkerColor(0.7)
		sender.setImage(UIImage(named: "notification_icon.png")?.maskWithColor(hexStringToUIColor(hex: "#ffffff").darkerColor(0.7)), for: UIControl.State())
	}

	override func didReceiveMemoryWarning() {
		super.didReceiveMemoryWarning()
		// Dispose of any resources that can be recreated.
	}

	func drawButtons() {
        print(sharedData!.buttons)

        if !sharedData!.hasButtons() {
            appButton.isHidden = false
            return
        }
        appButton.isHidden = true
		spinner.stopAnimating()

		for button in drawnButtons {
			button.removeFromSuperview()
		}
		drawnButtons = []

        for (index, element) in sharedData!.buttons.enumerated() {
			if (index > 17) {
				return
			}
			print("Item \(index): \(element)")
			if let button = drawButton(view, index, hexStringToUIColor(hex: element.color), element.name) {
				button.addTarget(self, action: #selector(buttonAction), for: .touchUpInside)
				button.addTarget(self, action: #selector(touchUp), for: .touchUpInside)
				button.addTarget(self, action: #selector(touchUp), for: .touchDragExit)
				button.addTarget(self, action: #selector(touchUp), for: .touchUpOutside)
				button.addTarget(self, action: #selector(touchUp), for: .touchCancel)
				button.addTarget(self, action: #selector(touchDown), for: .touchDown)
				drawnButtons.append(button)
				view.addSubview(button)
			}
		}
	}

	@available(iOSApplicationExtension 10.0, *)
	func widgetActiveDisplayModeDidChange(_ activeDisplayMode: NCWidgetDisplayMode, withMaximumSize maxSize: CGSize) {

        loadData()

        if (sharedData == nil || !sharedData!.isDefined() || activeDisplayMode == NCWidgetDisplayMode.compact) {
			self.preferredContentSize = CGSize(width: 0.0, height: 110.0)
        } else if (sharedData!.buttons.count <= 12) {
			self.preferredContentSize = CGSize(width: 0.0, height: 220.0)
		} else {
			self.preferredContentSize = CGSize(width: 0.0, height: 330.0)
		}
        drawButtons()
	}

	@available(iOSApplicationExtension 10.0, *)
	func setWidgetSize() {
        if (sharedData!.buttons.count <= 6) {
			self.extensionContext?.widgetLargestAvailableDisplayMode = NCWidgetDisplayMode.compact
		} else {
			self.extensionContext?.widgetLargestAvailableDisplayMode = NCWidgetDisplayMode.expanded
		}
	}

	override func viewDidLoad() {
		super.viewDidLoad()

		loadData()
        if (sharedData != nil && sharedData!.isDefined()) {
			if #available(iOSApplicationExtension 10.0, *) {
				setWidgetSize()
			}
			drawButtons()
		}
	}

	func widgetPerformUpdate(completionHandler: (@escaping (NCUpdateResult) -> Void)) {
		// Perform any setup necessary in order to update the view.
		loadData()
		if (sharedData != nil && sharedData!.isDefined()) {
			if #available(iOSApplicationExtension 10.0, *) {
				setWidgetSize()
			}
			drawButtons()
		}
		completionHandler(NCUpdateResult.newData)
	}
}
