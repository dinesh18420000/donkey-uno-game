Add-Type -AssemblyName System.Drawing

function Create-RoundedRectPath([float]$x, [float]$y, [float]$w, [float]$h, [float]$r) {
    $path = New-Object System.Drawing.Drawing2D.GraphicsPath
    $d = $r * 2
    $path.AddArc($x, $y, $d, $d, 180, 90)
    $path.AddArc($x + $w - $d, $y, $d, $d, 270, 90)
    $path.AddArc($x + $w - $d, $y + $h - $d, $d, $d, 0, 90)
    $path.AddArc($x, $y + $h - $d, $d, $d, 90, 90)
    $path.CloseFigure()
    return $path
}

function Draw-Sparkle([System.Drawing.Graphics]$g, [float]$cx, [float]$cy, [float]$size, [System.Drawing.Color]$color) {
    $path = New-Object System.Drawing.Drawing2D.GraphicsPath
    $h = $size
    $w = $size * 0.22
    # Vertical diamond
    $path.AddPolygon(@(
        (New-Object System.Drawing.PointF($cx, $cy - $h)),
        (New-Object System.Drawing.PointF($cx + $w, $cy)),
        (New-Object System.Drawing.PointF($cx, $cy + $h)),
        (New-Object System.Drawing.PointF($cx - $w, $cy))
    ))
    # Horizontal diamond
    $path.AddPolygon(@(
        (New-Object System.Drawing.PointF($cx - $h, $cy)),
        (New-Object System.Drawing.PointF($cx, $cy - $w)),
        (New-Object System.Drawing.PointF($cx + $h, $cy)),
        (New-Object System.Drawing.PointF($cx, $cy + $w))
    ))
    $b = New-Object System.Drawing.SolidBrush($color)
    $g.FillPath($b, $path)
    $b.Dispose()
    $path.Dispose()
    # Center white dot
    $cw = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::White)
    $g.FillEllipse($cw, $cx - $size*0.18, $cy - $size*0.18, $size*0.36, $size*0.36)
    $cw.Dispose()
}

function Draw-Crown([System.Drawing.Graphics]$g, [float]$cx, [float]$cy, [float]$scale) {
    $g.TranslateTransform($cx, $cy)
    $g.ScaleTransform($scale, $scale)

    # Crown base / body path
    # Peak points relative to center (0,0)
    $pts = @(
        (New-Object System.Drawing.PointF(-90, 45)),   # bottom left
        (New-Object System.Drawing.PointF(90, 45)),    # bottom right
        (New-Object System.Drawing.PointF(105, -30)),  # right peak
        (New-Object System.Drawing.PointF(55, 0)),     # inner right dip
        (New-Object System.Drawing.PointF(35, -55)),   # mid-right peak
        (New-Object System.Drawing.PointF(0, 10)),     # center dip
        (New-Object System.Drawing.PointF(0, -75)),    # tall center peak
        (New-Object System.Drawing.PointF(0, 10)),     # center dip
        (New-Object System.Drawing.PointF(-35, -55)),  # mid-left peak
        (New-Object System.Drawing.PointF(-55, 0)),    # inner left dip
        (New-Object System.Drawing.PointF(-105, -30))  # left peak
    )

    $crownPath = New-Object System.Drawing.Drawing2D.GraphicsPath
    $crownPath.AddLines(@(
        (New-Object System.Drawing.PointF(-90, 45)),
        (New-Object System.Drawing.PointF(-105, -30)),
        (New-Object System.Drawing.PointF(-55, 5)),
        (New-Object System.Drawing.PointF(-35, -55)),
        (New-Object System.Drawing.PointF(0, 0)),
        (New-Object System.Drawing.PointF(35, -55)),
        (New-Object System.Drawing.PointF(55, 5)),
        (New-Object System.Drawing.PointF(105, -30)),
        (New-Object System.Drawing.PointF(90, 45))
    ))
    $crownPath.CloseFigure()

    # Drop shadow
    $shadowBrush = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(120, 0, 0, 0))
    $g.TranslateTransform(0, 6)
    $g.FillPath($shadowBrush, $crownPath)
    $g.TranslateTransform(0, -6)
    $shadowBrush.Dispose()

    # Gold gradient fill
    $goldBrush = New-Object System.Drawing.Drawing2D.LinearGradientBrush(
        (New-Object System.Drawing.PointF(0, -75)),
        (New-Object System.Drawing.PointF(0, 45)),
        [System.Drawing.Color]::FromArgb(255, 255, 235, 130),
        [System.Drawing.Color]::FromArgb(255, 217, 119, 6)
    )
    $g.FillPath($goldBrush, $crownPath)
    $goldBrush.Dispose()

    # Gold outline
    $goldPen = New-Object System.Drawing.Pen([System.Drawing.Color]::FromArgb(255, 254, 240, 138), 4)
    $g.DrawPath($goldPen, $crownPath)
    $goldPen.Dispose()

    # Crown rim base band
    $bandPath = Create-RoundedRectPath -88 28 176 22 6
    $bandBrush = New-Object System.Drawing.Drawing2D.LinearGradientBrush(
        (New-Object System.Drawing.PointF(-88, 28)),
        (New-Object System.Drawing.PointF(88, 50)),
        [System.Drawing.Color]::FromArgb(255, 180, 83, 9),
        [System.Drawing.Color]::FromArgb(255, 245, 158, 11)
    )
    $g.FillPath($bandBrush, $bandPath)
    $bandPen = New-Object System.Drawing.Pen([System.Drawing.Color]::FromArgb(255, 254, 240, 138), 2.5)
    $g.DrawPath($bandPen, $bandPath)
    $bandBrush.Dispose()
    $bandPen.Dispose()
    $bandPath.Dispose()

    # Jewels on crown peaks
    # Left, mid-left, center, mid-right, right
    $rubyBrush = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(255, 239, 68, 68))
    $emeraldBrush = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(255, 16, 185, 129))
    $goldDotBrush = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(255, 254, 240, 138))

    # Center jewel (Large ruby)
    $g.FillEllipse($rubyBrush, -9, -84, 18, 18)
    $g.DrawEllipse((New-Object System.Drawing.Pen([System.Drawing.Color]::Gold, 2)), -9, -84, 18, 18)

    # Mid peaks (Emeralds)
    $g.FillEllipse($emeraldBrush, -42, -62, 14, 14)
    $g.DrawEllipse((New-Object System.Drawing.Pen([System.Drawing.Color]::Gold, 1.8)), -42, -62, 14, 14)
    $g.FillEllipse($emeraldBrush, 28, -62, 14, 14)
    $g.DrawEllipse((New-Object System.Drawing.Pen([System.Drawing.Color]::Gold, 1.8)), 28, -62, 14, 14)

    # Side peaks (Rubies)
    $g.FillEllipse($rubyBrush, -111, -37, 12, 12)
    $g.DrawEllipse((New-Object System.Drawing.Pen([System.Drawing.Color]::Gold, 1.8)), -111, -37, 12, 12)
    $g.FillEllipse($rubyBrush, 99, -37, 12, 12)
    $g.DrawEllipse((New-Object System.Drawing.Pen([System.Drawing.Color]::Gold, 1.8)), 99, -37, 12, 12)

    # Rim Jewels
    $g.FillEllipse($rubyBrush, -60, 33, 12, 12)
    $g.FillEllipse($emeraldBrush, -25, 33, 12, 12)
    $g.FillEllipse($rubyBrush, 13, 33, 12, 12)
    $g.FillEllipse($emeraldBrush, 48, 33, 12, 12)

    $rubyBrush.Dispose()
    $emeraldBrush.Dispose()
    $goldDotBrush.Dispose()
    $crownPath.Dispose()

    $g.ResetTransform()
}

function Draw-PlayingCards([System.Drawing.Graphics]$g, [float]$cx, [float]$cy, [float]$scale) {
    # 1. LEFT CARD: UNO "NO MERCY" Wild / Flame Card (Tilted -16 deg)
    $state1 = $g.Save()
    $g.TranslateTransform($cx - 45 * $scale, $cy + 15 * $scale)
    $g.RotateTransform(-15)
    $g.ScaleTransform($scale, $scale)

    $cardW = 120
    $cardH = 175
    $cardR = 14

    # Drop shadow
    $cShadow = Create-RoundedRectPath (-$cardW/2 + 5) (-$cardH/2 + 7) $cardW $cardH $cardR
    $sBrush = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(140, 0, 0, 0))
    $g.FillPath($sBrush, $cShadow)
    $sBrush.Dispose()
    $cShadow.Dispose()

    # UNO Card Outer (Deep black / fiery red rim)
    $unoCard = Create-RoundedRectPath (-$cardW/2) (-$cardH/2) $cardW $cardH $cardR
    $unoBg = New-Object System.Drawing.Drawing2D.LinearGradientBrush(
        (New-Object System.Drawing.PointF(0, -$cardH/2)),
        (New-Object System.Drawing.PointF(0, $cardH/2)),
        [System.Drawing.Color]::FromArgb(255, 30, 10, 10),
        [System.Drawing.Color]::FromArgb(255, 15, 5, 25)
    )
    $g.FillPath($unoBg, $unoCard)
    $unoPen = New-Object System.Drawing.Pen([System.Drawing.Color]::FromArgb(255, 239, 68, 68), 4)
    $g.DrawPath($unoPen, $unoCard)
    $unoBg.Dispose()
    $unoPen.Dispose()

    # Inner UNO Color Oval / Arc (Tilted oval inside card)
    $g.RotateTransform(-25)
    $ovalW = 86
    $ovalH = 125
    $ovalPath = New-Object System.Drawing.Drawing2D.GraphicsPath
    $ovalPath.AddEllipse(-$ovalW/2, -$ovalH/2, $ovalW, $ovalH)
    
    # 4-quadrant / rainbow style gradient
    $ovalBrush = New-Object System.Drawing.Drawing2D.LinearGradientBrush(
        (New-Object System.Drawing.PointF(-$ovalW/2, -$ovalH/2)),
        (New-Object System.Drawing.PointF($ovalW/2, $ovalH/2)),
        [System.Drawing.Color]::FromArgb(255, 239, 68, 68),  # Red
        [System.Drawing.Color]::FromArgb(255, 234, 179, 8)   # Yellow
    )
    $g.FillPath($ovalBrush, $ovalPath)
    $ovalPen = New-Object System.Drawing.Pen([System.Drawing.Color]::FromArgb(255, 255, 255, 255), 3)
    $g.DrawPath($ovalPen, $ovalPath)
    $ovalBrush.Dispose()
    $ovalPen.Dispose()
    $ovalPath.Dispose()

    # "UNO" text in oval
    $sf = New-Object System.Drawing.StringFormat
    $sf.Alignment = [System.Drawing.StringAlignment]::Center
    $sf.LineAlignment = [System.Drawing.StringAlignment]::Center
    $fontUno = New-Object System.Drawing.Font("Arial Black", 24, [System.Drawing.FontStyle]::Bold)
    
    # Text shadow
    $g.DrawString("UNO", $fontUno, (New-Object System.Drawing.SolidBrush([System.Drawing.Color]::Black)), 2, 2, $sf)
    $g.DrawString("UNO", $fontUno, (New-Object System.Drawing.SolidBrush([System.Drawing.Color]::White)), 0, 0, $sf)
    $fontUno.Dispose()
    $sf.Dispose()

    $g.RotateTransform(25) # undo oval rotation for corner marks
    
    # Corner badges
    $fontCorner = New-Object System.Drawing.Font("Arial Black", 12, [System.Drawing.FontStyle]::Bold)
    $g.DrawString("+4", $fontCorner, (New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(255, 250, 204, 21))), (-$cardW/2 + 6), (-$cardH/2 + 5))
    $g.DrawString("+4", $fontCorner, (New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(255, 250, 204, 21))), ($cardW/2 - 28), ($cardH/2 - 22))
    $fontCorner.Dispose()

    $unoCard.Dispose()
    $g.Restore($state1)

    # 2. RIGHT CARD: DONKEY MASTER Royal Card (Tilted +14 deg)
    $state2 = $g.Save()
    $g.TranslateTransform($cx + 45 * $scale, $cy + 15 * $scale)
    $g.RotateTransform(14)
    $g.ScaleTransform($scale, $scale)

    # Shadow
    $dShadow = Create-RoundedRectPath (-$cardW/2 + 5) (-$cardH/2 + 7) $cardW $cardH $cardR
    $sBrush2 = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(150, 0, 0, 0))
    $g.FillPath($sBrush2, $dShadow)
    $sBrush2.Dispose()
    $dShadow.Dispose()

    # Card body: Royal Ivory with Gold Rim
    $donkeyCard = Create-RoundedRectPath (-$cardW/2) (-$cardH/2) $cardW $cardH $cardR
    $dIvory = New-Object System.Drawing.Drawing2D.LinearGradientBrush(
        (New-Object System.Drawing.PointF(0, -$cardH/2)),
        (New-Object System.Drawing.PointF(0, $cardH/2)),
        [System.Drawing.Color]::FromArgb(255, 255, 255, 255),
        [System.Drawing.Color]::FromArgb(255, 241, 245, 249)
    )
    $g.FillPath($dIvory, $donkeyCard)
    $dPen = New-Object System.Drawing.Pen([System.Drawing.Color]::FromArgb(255, 217, 119, 6), 4)
    $g.DrawPath($dPen, $donkeyCard)
    $dIvory.Dispose()
    $dPen.Dispose()

    # Inner filigree rectangle
    $innerCard = Create-RoundedRectPath (-$cardW/2 + 8) (-$cardH/2 + 8) ($cardW - 16) ($cardH - 16) 8
    $inPen = New-Object System.Drawing.Pen([System.Drawing.Color]::FromArgb(255, 251, 191, 36), 1.5)
    $g.DrawPath($inPen, $innerCard)
    $inPen.Dispose()
    $innerCard.Dispose()

    # Center Royal Spade & Donkey Mascot Crest
    # Draw Spade symbol
    $spadeBrush = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(255, 24, 24, 27))
    $spadeFont = New-Object System.Drawing.Font("Arial", 46, [System.Drawing.FontStyle]::Bold)
    $sfSpade = New-Object System.Drawing.StringFormat
    $sfSpade.Alignment = [System.Drawing.StringAlignment]::Center
    $sfSpade.LineAlignment = [System.Drawing.StringAlignment]::Center
    $g.DrawString([char]0x2660, $spadeFont, $spadeBrush, 0, -2, $sfSpade)
    $spadeFont.Dispose()
    $sfSpade.Dispose()
    $spadeBrush.Dispose()

    # Corner "K" and Spade
    $fontK = New-Object System.Drawing.Font("Arial Black", 13, [System.Drawing.FontStyle]::Bold)
    $kBrush = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(255, 180, 83, 9))
    $g.DrawString("K", $fontK, $kBrush, (-$cardW/2 + 7), (-$cardH/2 + 6))
    $g.DrawString([char]0x2660, (New-Object System.Drawing.Font("Arial", 11)), $kBrush, (-$cardW/2 + 8), (-$cardH/2 + 23))
    
    $g.DrawString("K", $fontK, $kBrush, ($cardW/2 - 20), ($cardH/2 - 38))
    $g.DrawString([char]0x2660, (New-Object System.Drawing.Font("Arial", 11)), $kBrush, ($cardW/2 - 19), ($cardH/2 - 21))
    $kBrush.Dispose()
    $fontK.Dispose()

    $donkeyCard.Dispose()
    $g.Restore($state2)
}

function Draw-BottomBanner([System.Drawing.Graphics]$g, [float]$cx, [float]$cy, [float]$scale) {
    $state = $g.Save()
    $g.TranslateTransform($cx, $cy)
    $g.ScaleTransform($scale, $scale)

    $bannerW = 340
    $bannerH = 72
    $bannerR = 18

    # Banner Shadow
    $bShadow = Create-RoundedRectPath (-$bannerW/2 + 3) (-$bannerH/2 + 6) $bannerW $bannerH $bannerR
    $sBrush = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(160, 0, 0, 0))
    $g.FillPath($sBrush, $bShadow)
    $sBrush.Dispose()
    $bShadow.Dispose()

    # Banner Base: Deep Royal Crimson-Gold ribbon gradient
    $bPath = Create-RoundedRectPath (-$bannerW/2) (-$bannerH/2) $bannerW $bannerH $bannerR
    $bGrad = New-Object System.Drawing.Drawing2D.LinearGradientBrush(
        (New-Object System.Drawing.PointF(0, -$bannerH/2)),
        (New-Object System.Drawing.PointF(0, $bannerH/2)),
        [System.Drawing.Color]::FromArgb(255, 185, 28, 28),  # Crimson red
        [System.Drawing.Color]::FromArgb(255, 69, 10, 10)    # Deep wine
    )
    $g.FillPath($bGrad, $bPath)
    
    # Golden border on ribbon
    $goldPen = New-Object System.Drawing.Pen([System.Drawing.Color]::FromArgb(255, 251, 191, 36), 3.5)
    $g.DrawPath($goldPen, $bPath)
    $goldPen.Dispose()
    $bGrad.Dispose()
    $bPath.Dispose()

    # Inner subtle highlight bar
    $hiPath = Create-RoundedRectPath (-$bannerW/2 + 5) (-$bannerH/2 + 4) ($bannerW - 10) ($bannerH/2 - 4) 10
    $hiBrush = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(60, 255, 255, 255))
    $g.FillPath($hiBrush, $hiPath)
    $hiBrush.Dispose()
    $hiPath.Dispose()

    # Texts:
    # Top text: "DONKEY MASTER" in bright gold
    # Bottom text: "& UNO NO MERCY" in fiery amber
    $sf = New-Object System.Drawing.StringFormat
    $sf.Alignment = [System.Drawing.StringAlignment]::Center
    $sf.LineAlignment = [System.Drawing.StringAlignment]::Center

    $fontTop = New-Object System.Drawing.Font("Arial Black", 16, [System.Drawing.FontStyle]::Bold)
    $fontSub = New-Object System.Drawing.Font("Arial Black", 11, [System.Drawing.FontStyle]::Bold)

    # Shadow for top text
    $g.DrawString("DONKEY MASTER", $fontTop, (New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(200, 0, 0, 0))), 1, -12, $sf)
    $g.DrawString("DONKEY MASTER", $fontTop, (New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(255, 254, 240, 138))), 0, -14, $sf)

    # Sub text
    $g.DrawString("& UNO NO MERCY", $fontSub, (New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(200, 0, 0, 0))), 1, 17, $sf)
    $g.DrawString("& UNO NO MERCY", $fontSub, (New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(255, 248, 113, 113))), 0, 16, $sf)

    $fontTop.Dispose()
    $fontSub.Dispose()
    $sf.Dispose()

    $g.Restore($state)
}

function Render-AppIcon([int]$size, [string]$type) {
    # $type: "full" (with background & border), "round" (clipped circle), "foreground" (transparent, centered in safe-zone)
    $bmp = New-Object System.Drawing.Bitmap($size, $size)
    $g = [System.Drawing.Graphics]::FromImage($bmp)
    $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
    $g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
    $g.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
    $g.TextRenderingHint = [System.Drawing.Text.TextRenderingHint]::ClearTypeGridFit

    $scale = $size / 512.0

    if ($type -eq "foreground") {
        # Transparent background, artwork scaled to fit nicely inside the 66% Android safe-zone
        $g.Clear([System.Drawing.Color]::Transparent)
        
        # Center elements slightly scaled down so circle/squircle mask cuts nothing
        $fgScale = $scale * 0.85
        $cx = $size / 2.0
        $cy = $size / 2.0

        # Background glow behind cards
        $glowBrush = New-Object System.Drawing.Drawing2D.PathGradientBrush(@(
            (New-Object System.Drawing.PointF(0, 0)),
            (New-Object System.Drawing.PointF($size, 0)),
            (New-Object System.Drawing.PointF($size, $size)),
            (New-Object System.Drawing.PointF(0, $size))
        ))
        $glowBrush.CenterColor = [System.Drawing.Color]::FromArgb(140, 124, 58, 237)
        $glowBrush.SurroundColors = @([System.Drawing.Color]::FromArgb(0, 23, 7, 43))
        $g.FillEllipse($glowBrush, ($cx - 180 * $fgScale), ($cy - 180 * $fgScale), (360 * $fgScale), (360 * $fgScale))
        $glowBrush.Dispose()

        Draw-PlayingCards $g $cx ($cy - 20 * $fgScale) ($fgScale * 1.05)
        Draw-Crown $g $cx ($cy - 100 * $fgScale) ($fgScale * 0.95)
        Draw-BottomBanner $g $cx ($cy + 130 * $fgScale) ($fgScale * 0.95)

        # Sparkles
        Draw-Sparkle $g ($cx - 130 * $fgScale) ($cy - 90 * $fgScale) (22 * $fgScale) [System.Drawing.Color]::Gold
        Draw-Sparkle $g ($cx + 130 * $fgScale) ($cy - 70 * $fgScale) (25 * $fgScale) [System.Drawing.Color]::Gold
        Draw-Sparkle $g ($cx + 110 * $fgScale) ($cy + 60 * $fgScale) (18 * $fgScale) [System.Drawing.Color]::White

    } else {
        # Full icon with background & border
        $g.Clear([System.Drawing.Color]::Transparent)

        if ($type -eq "round") {
            $clipPath = New-Object System.Drawing.Drawing2D.GraphicsPath
            $clipPath.AddEllipse(2 * $scale, 2 * $scale, ($size - 4 * $scale), ($size - 4 * $scale))
            $g.SetClip($clipPath)
        } else {
            $sqPath = Create-RoundedRectPath (2 * $scale) (2 * $scale) ($size - 4 * $scale) ($size - 4 * $scale) (105 * $scale)
            $g.SetClip($sqPath)
        }

        # Background Gradient: Rich Royal Midnight Violet
        $bgBrush = New-Object System.Drawing.Drawing2D.LinearGradientBrush(
            (New-Object System.Drawing.PointF(0, 0)),
            (New-Object System.Drawing.PointF($size, $size)),
            [System.Drawing.Color]::FromArgb(255, 30, 8, 55),
            [System.Drawing.Color]::FromArgb(255, 12, 3, 24)
        )
        $g.FillRectangle($bgBrush, 0, 0, $size, $size)
        $bgBrush.Dispose()

        # Radial center spotlight
        $spotPath = New-Object System.Drawing.Drawing2D.GraphicsPath
        $spotPath.AddEllipse(($size * 0.05), ($size * 0.05), ($size * 0.9), ($size * 0.9))
        $spotBrush = New-Object System.Drawing.Drawing2D.PathGradientBrush($spotPath)
        $spotBrush.CenterColor = [System.Drawing.Color]::FromArgb(190, 109, 40, 217) # vibrant purple glow
        $spotBrush.SurroundColors = @([System.Drawing.Color]::FromArgb(0, 15, 5, 30))
        $g.FillPath($spotBrush, $spotPath)
        $spotBrush.Dispose()
        $spotPath.Dispose()

        # Cards, Crown & Banner
        $cx = $size / 2.0
        $cy = $size / 2.0
        Draw-PlayingCards $g $cx ($cy - 15 * $scale) ($scale * 1.1)
        Draw-Crown $g $cx ($cy - 110 * $scale) ($scale * 1.0)
        Draw-BottomBanner $g $cx ($cy + 155 * $scale) ($scale * 1.05)

        # Sparkles
        Draw-Sparkle $g ($cx - 155 * $scale) ($cy - 100 * $scale) (26 * $scale) [System.Drawing.Color]::Gold
        Draw-Sparkle $g ($cx + 155 * $scale) ($cy - 85 * $scale) (28 * $scale) [System.Drawing.Color]::Gold
        Draw-Sparkle $g ($cx - 140 * $scale) ($cy + 75 * $scale) (20 * $scale) [System.Drawing.Color]::White
        Draw-Sparkle $g ($cx + 140 * $scale) ($cy + 85 * $scale) (22 * $scale) [System.Drawing.Color]::Gold

        $g.ResetClip()

        # Dual Metallic Golden Outer Rim
        if ($type -eq "round") {
            $rimPen = New-Object System.Drawing.Pen([System.Drawing.Color]::FromArgb(255, 234, 179, 8), 12 * $scale)
            $g.DrawEllipse($rimPen, 6 * $scale, 6 * $scale, ($size - 12 * $scale), ($size - 12 * $scale))
            $rimPen.Dispose()

            $innerRim = New-Object System.Drawing.Pen([System.Drawing.Color]::FromArgb(180, 254, 240, 138), 2.5 * $scale)
            $g.DrawEllipse($innerRim, 13 * $scale, 13 * $scale, ($size - 26 * $scale), ($size - 26 * $scale))
            $innerRim.Dispose()
        } else {
            $borderPath = Create-RoundedRectPath (6 * $scale) (6 * $scale) ($size - 12 * $scale) ($size - 12 * $scale) (100 * $scale)
            $rimPen = New-Object System.Drawing.Pen([System.Drawing.Color]::FromArgb(255, 234, 179, 8), 12 * $scale)
            $g.DrawPath($rimPen, $borderPath)
            $rimPen.Dispose()

            $innerBorder = Create-RoundedRectPath (13 * $scale) (13 * $scale) ($size - 26 * $scale) ($size - 26 * $scale) (94 * $scale)
            $innerRim = New-Object System.Drawing.Pen([System.Drawing.Color]::FromArgb(180, 254, 240, 138), 2.5 * $scale)
            $g.DrawPath($innerRim, $borderPath)
            $innerRim.Dispose()
            $innerBorder.Dispose()
            $borderPath.Dispose()
        }
    }

    $g.Dispose()
    return $bmp
}

Write-Output "Rendering application icons..."

# 1. Web & Server master icons (512x512)
$icon512 = Render-AppIcon 512 "full"
$icon512.Save("$pwd\client\public\icon.png", [System.Drawing.Imaging.ImageFormat]::Png)
$icon512.Save("$pwd\client\public\favicon.png", [System.Drawing.Imaging.ImageFormat]::Png)
if (Test-Path "$pwd\server\public") {
    $icon512.Save("$pwd\server\public\icon.png", [System.Drawing.Imaging.ImageFormat]::Png)
    $icon512.Save("$pwd\server\public\favicon.png", [System.Drawing.Imaging.ImageFormat]::Png)
}
$icon512.Dispose()
Write-Output "Web 512x512 icons saved."

# 2. Android density definitions
$densities = @(
    @{ Name = "mipmap-mdpi";    IconSize = 48;  FgSize = 108 },
    @{ Name = "mipmap-hdpi";    IconSize = 72;  FgSize = 162 },
    @{ Name = "mipmap-xhdpi";   IconSize = 96;  FgSize = 216 },
    @{ Name = "mipmap-xxhdpi";  IconSize = 144; FgSize = 324 },
    @{ Name = "mipmap-xxxhdpi"; IconSize = 192; FgSize = 432 }
)

$resDir = "$pwd\client\android\app\src\main\res"

foreach ($d in $densities) {
    $dir = Join-Path $resDir $d.Name
    if (-not (Test-Path $dir)) {
        New-Item -ItemType Directory -Path $dir -Force | Out-Null
    }

    # ic_launcher.png (squircle)
    $ic = Render-AppIcon $d.IconSize "full"
    $ic.Save((Join-Path $dir "ic_launcher.png"), [System.Drawing.Imaging.ImageFormat]::Png)
    $ic.Dispose()

    # ic_launcher_round.png (circle)
    $icRound = Render-AppIcon $d.IconSize "round"
    $icRound.Save((Join-Path $dir "ic_launcher_round.png"), [System.Drawing.Imaging.ImageFormat]::Png)
    $icRound.Dispose()

    # ic_launcher_foreground.png (safe zone centered on transparent canvas)
    $fg = Render-AppIcon $d.FgSize "foreground"
    $fg.Save((Join-Path $dir "ic_launcher_foreground.png"), [System.Drawing.Imaging.ImageFormat]::Png)
    $fg.Dispose()

    Write-Output "Generated icons for $($d.Name): $($d.IconSize)x$($d.IconSize), foreground $($d.FgSize)x$($d.FgSize)"
}

Write-Output "All application icons successfully generated!"
