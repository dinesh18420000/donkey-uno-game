using System;
using System.Drawing;
using System.Drawing.Drawing2D;
using System.Drawing.Text;
using System.IO;

public class IconGenerator
{
    private static GraphicsPath CreateRoundedRectangle(float x, float y, float width, float height, float radius)
    {
        GraphicsPath path = new GraphicsPath();
        float diameter = radius * 2f;
        path.AddArc(x, y, diameter, diameter, 180, 90);
        path.AddArc(x + width - diameter, y, diameter, diameter, 270, 90);
        path.AddArc(x + width - diameter, y + height - diameter, diameter, diameter, 0, 90);
        path.AddArc(x, y + height - diameter, diameter, diameter, 90, 90);
        path.CloseFigure();
        return path;
    }

    private static void DrawSparkle(Graphics g, float cx, float cy, float size, Color color)
    {
        float h = size;
        float w = size * 0.22f;

        using (GraphicsPath path = new GraphicsPath())
        {
            // Vertical diamond
            path.AddPolygon(new PointF[] {
                new PointF(cx, cy - h),
                new PointF(cx + w, cy),
                new PointF(cx, cy + h),
                new PointF(cx - w, cy)
            });
            // Horizontal diamond
            path.AddPolygon(new PointF[] {
                new PointF(cx - h, cy),
                new PointF(cx, cy - w),
                new PointF(cx + h, cy),
                new PointF(cx, cy + w)
            });

            using (SolidBrush brush = new SolidBrush(color))
            {
                g.FillPath(brush, path);
            }
        }

        // Center bright dot
        float dotR = size * 0.20f;
        using (SolidBrush whiteBrush = new SolidBrush(Color.White))
        {
            g.FillEllipse(whiteBrush, cx - dotR, cy - dotR, dotR * 2, dotR * 2);
        }
    }

    private static void DrawUnoCard(Graphics g, float scale)
    {
        float cardW = 126f;
        float cardH = 184f;
        float cardR = 14f;

        // Card outer shadow
        using (GraphicsPath shadowPath = CreateRoundedRectangle(-cardW / 2f + 4f, -cardH / 2f + 6f, cardW, cardH, cardR))
        using (SolidBrush shadowBrush = new SolidBrush(Color.FromArgb(150, 0, 0, 0)))
        {
            g.FillPath(shadowBrush, shadowPath);
        }

        // Card body (Deep obsidian)
        using (GraphicsPath cardPath = CreateRoundedRectangle(-cardW / 2f, -cardH / 2f, cardW, cardH, cardR))
        {
            using (LinearGradientBrush bgBrush = new LinearGradientBrush(
                new PointF(0, -cardH / 2f),
                new PointF(0, cardH / 2f),
                Color.FromArgb(255, 35, 12, 18),
                Color.FromArgb(255, 16, 5, 24)))
            {
                g.FillPath(bgBrush, cardPath);
            }

            // Fiery crimson border
            using (Pen borderPen = new Pen(Color.FromArgb(255, 239, 68, 68), 4f))
            {
                g.DrawPath(borderPen, cardPath);
            }
            using (Pen innerPen = new Pen(Color.FromArgb(160, 249, 115, 22), 1.5f))
            {
                using (GraphicsPath inner = CreateRoundedRectangle(-cardW / 2f + 4f, -cardH / 2f + 4f, cardW - 8f, cardH - 8f, cardR - 3f))
                {
                    g.DrawPath(innerPen, inner);
                }
            }
        }

        // Center UNO oval with tilt
        GraphicsState state = g.Save();
        g.RotateTransform(-22f);
        float ovalW = 88f;
        float ovalH = 126f;

        using (GraphicsPath ovalPath = new GraphicsPath())
        {
            ovalPath.AddEllipse(-ovalW / 2f, -ovalH / 2f, ovalW, ovalH);

            // Fiery 4-color gradient representation
            using (LinearGradientBrush ovalBrush = new LinearGradientBrush(
                new PointF(-ovalW / 2f, -ovalH / 2f),
                new PointF(ovalW / 2f, ovalH / 2f),
                Color.FromArgb(255, 239, 68, 68), // Red
                Color.FromArgb(255, 234, 179, 8)   // Yellow
            ))
            {
                g.FillPath(ovalBrush, ovalPath);
            }

            using (Pen ovalPen = new Pen(Color.White, 3.5f))
            {
                g.DrawPath(ovalPen, ovalPath);
            }
        }

        // Bold "UNO" Text
        using (StringFormat sf = new StringFormat { Alignment = StringAlignment.Center, LineAlignment = StringAlignment.Center })
        using (Font fontUno = new Font("Arial Black", 24f, FontStyle.Bold))
        {
            // Drop shadow
            using (SolidBrush blackBrush = new SolidBrush(Color.FromArgb(220, 0, 0, 0)))
            {
                g.DrawString("UNO", fontUno, blackBrush, 2.5f, 2.5f, sf);
            }
            // Outline
            using (GraphicsPath textPath = new GraphicsPath())
            {
                textPath.AddString("UNO", fontUno.FontFamily, (int)FontStyle.Bold, 30f, new PointF(0, 0), sf);
                using (Pen textStroke = new Pen(Color.FromArgb(255, 185, 28, 28), 5f))
                {
                    g.DrawPath(textStroke, textPath);
                }
            }
            // Text Fill
            using (SolidBrush whiteBrush = new SolidBrush(Color.White))
            {
                g.DrawString("UNO", fontUno, whiteBrush, 0, 0, sf);
            }
        }

        g.Restore(state);

        // Corner Badges "+4" and Flame
        using (Font fontCorner = new Font("Arial Black", 12f, FontStyle.Bold))
        using (SolidBrush yellowBrush = new SolidBrush(Color.FromArgb(255, 250, 204, 21)))
        {
            g.DrawString("+4", fontCorner, yellowBrush, -cardW / 2f + 6f, -cardH / 2f + 6f);
            g.DrawString("+4", fontCorner, yellowBrush, cardW / 2f - 28f, cardH / 2f - 24f);
        }
    }

    private static void DrawDonkeyCard(Graphics g, float scale)
    {
        float cardW = 126f;
        float cardH = 184f;
        float cardR = 14f;

        // Card shadow
        using (GraphicsPath shadowPath = CreateRoundedRectangle(-cardW / 2f + 5f, -cardH / 2f + 7f, cardW, cardH, cardR))
        using (SolidBrush shadowBrush = new SolidBrush(Color.FromArgb(160, 0, 0, 0)))
        {
            g.FillPath(shadowBrush, shadowPath);
        }

        // Royal Ivory Card
        using (GraphicsPath cardPath = CreateRoundedRectangle(-cardW / 2f, -cardH / 2f, cardW, cardH, cardR))
        {
            using (LinearGradientBrush ivoryBrush = new LinearGradientBrush(
                new PointF(0, -cardH / 2f),
                new PointF(0, cardH / 2f),
                Color.FromArgb(255, 255, 255, 255),
                Color.FromArgb(255, 238, 242, 246)))
            {
                g.FillPath(ivoryBrush, cardPath);
            }

            // Gold Card Border
            using (Pen goldPen = new Pen(Color.FromArgb(255, 217, 119, 6), 4f))
            {
                g.DrawPath(goldPen, cardPath);
            }

            // Inner filigree
            using (GraphicsPath inner = CreateRoundedRectangle(-cardW / 2f + 7f, -cardH / 2f + 7f, cardW - 14f, cardH - 14f, cardR - 4f))
            using (Pen innerPen = new Pen(Color.FromArgb(255, 245, 158, 11), 1.5f))
            {
                g.DrawPath(innerPen, inner);
            }
        }

        // Center Spade Symbol ♠ with high contrast
        using (StringFormat sf = new StringFormat { Alignment = StringAlignment.Center, LineAlignment = StringAlignment.Center })
        using (Font spadeFont = new Font("Arial", 46f, FontStyle.Bold))
        using (SolidBrush spadeBrush = new SolidBrush(Color.FromArgb(255, 24, 24, 27)))
        {
            g.DrawString("\u2660", spadeFont, spadeBrush, 0, -4f, sf);
        }

        // Little gold crown over the spade center
        using (GraphicsPath miniCrown = new GraphicsPath())
        {
            miniCrown.AddLines(new PointF[] {
                new PointF(-14f, -4f),
                new PointF(-18f, -22f),
                new PointF(-8f, -14f),
                new PointF(0f, -26f),
                new PointF(8f, -14f),
                new PointF(18f, -22f),
                new PointF(14f, -4f)
            });
            miniCrown.CloseFigure();
            using (SolidBrush crownGold = new SolidBrush(Color.FromArgb(255, 234, 179, 8)))
            {
                g.FillPath(crownGold, miniCrown);
            }
            using (Pen crownPen = new Pen(Color.FromArgb(255, 254, 240, 138), 1.2f))
            {
                g.DrawPath(crownPen, miniCrown);
            }
        }

        // Corner "K" and ♠
        using (Font fontK = new Font("Arial Black", 13f, FontStyle.Bold))
        using (Font fontSpade = new Font("Arial", 11f, FontStyle.Bold))
        using (SolidBrush kBrush = new SolidBrush(Color.FromArgb(255, 180, 83, 9)))
        {
            g.DrawString("K", fontK, kBrush, -cardW / 2f + 6f, -cardH / 2f + 5f);
            g.DrawString("\u2660", fontSpade, kBrush, -cardW / 2f + 7f, -cardH / 2f + 22f);

            g.DrawString("K", fontK, kBrush, cardW / 2f - 22f, cardH / 2f - 39f);
            g.DrawString("\u2660", fontSpade, kBrush, cardW / 2f - 21f, cardH / 2f - 22f);
        }
    }

    private static void DrawCrown(Graphics g)
    {
        // 5-peak majestic crown
        using (GraphicsPath crownPath = new GraphicsPath())
        {
            crownPath.AddLines(new PointF[] {
                new PointF(-92f, 44f),
                new PointF(-108f, -26f),
                new PointF(-56f, 6f),
                new PointF(-36f, -54f),
                new PointF(0f, 0f),
                new PointF(36f, -54f),
                new PointF(56f, 6f),
                new PointF(108f, -26f),
                new PointF(92f, 44f)
            });
            crownPath.CloseFigure();

            // Crown Drop Shadow
            GraphicsState sShadow = g.Save();
            g.TranslateTransform(0, 6f);
            using (SolidBrush cShadow = new SolidBrush(Color.FromArgb(140, 0, 0, 0)))
            {
                g.FillPath(cShadow, crownPath);
            }
            g.Restore(sShadow);

            // Gold Gradient fill
            using (LinearGradientBrush goldBrush = new LinearGradientBrush(
                new PointF(0, -60f),
                new PointF(0, 44f),
                Color.FromArgb(255, 255, 238, 140),
                Color.FromArgb(255, 217, 119, 6)))
            {
                g.FillPath(goldBrush, crownPath);
            }

            // Bright Golden Outline
            using (Pen goldPen = new Pen(Color.FromArgb(255, 254, 240, 138), 3.5f))
            {
                g.DrawPath(goldPen, crownPath);
            }
        }

        // Crown Base Band
        using (GraphicsPath band = CreateRoundedRectangle(-90f, 26f, 180f, 24f, 6f))
        {
            using (LinearGradientBrush bandBrush = new LinearGradientBrush(
                new PointF(0, 26f),
                new PointF(0, 50f),
                Color.FromArgb(255, 245, 158, 11),
                Color.FromArgb(255, 180, 83, 9)))
            {
                g.FillPath(bandBrush, band);
            }
            using (Pen bandPen = new Pen(Color.FromArgb(255, 254, 240, 138), 2.5f))
            {
                g.DrawPath(bandPen, band);
            }
        }

        // Crown Jewels
        using (SolidBrush rubyBrush = new SolidBrush(Color.FromArgb(255, 239, 68, 68)))
        using (SolidBrush emeraldBrush = new SolidBrush(Color.FromArgb(255, 16, 185, 129)))
        using (Pen gemPen = new Pen(Color.FromArgb(255, 254, 240, 138), 1.8f))
        {
            // Center Ruby (Big diamond / circle)
            g.FillEllipse(rubyBrush, -11f, -80f, 22f, 22f);
            g.DrawEllipse(gemPen, -11f, -80f, 22f, 22f);

            // Mid Emeralds
            g.FillEllipse(emeraldBrush, -44f, -61f, 16f, 16f);
            g.DrawEllipse(gemPen, -44f, -61f, 16f, 16f);
            g.FillEllipse(emeraldBrush, 28f, -61f, 16f, 16f);
            g.DrawEllipse(gemPen, 28f, -61f, 16f, 16f);

            // Outer Rubies
            g.FillEllipse(rubyBrush, -115f, -34f, 14f, 14f);
            g.DrawEllipse(gemPen, -115f, -34f, 14f, 14f);
            g.FillEllipse(rubyBrush, 101f, -34f, 14f, 14f);
            g.DrawEllipse(gemPen, 101f, -34f, 14f, 14f);

            // Rim Jewels (Alternating ruby and emerald)
            g.FillEllipse(rubyBrush, -65f, 32f, 12f, 12f);
            g.FillEllipse(emeraldBrush, -25f, 32f, 12f, 12f);
            g.FillEllipse(rubyBrush, 15f, 32f, 12f, 12f);
            g.FillEllipse(emeraldBrush, 55f, 32f, 12f, 12f);
        }
    }

    private static void DrawBottomBanner(Graphics g)
    {
        float bannerW = 350f;
        float bannerH = 74f;
        float bannerR = 18f;

        // Shadow
        using (GraphicsPath sPath = CreateRoundedRectangle(-bannerW / 2f + 4f, -bannerH / 2f + 7f, bannerW, bannerH, bannerR))
        using (SolidBrush sBrush = new SolidBrush(Color.FromArgb(170, 0, 0, 0)))
        {
            g.FillPath(sBrush, sPath);
        }

        // Royal Crimson / Wine Ribbon
        using (GraphicsPath bPath = CreateRoundedRectangle(-bannerW / 2f, -bannerH / 2f, bannerW, bannerH, bannerR))
        {
            using (LinearGradientBrush bGrad = new LinearGradientBrush(
                new PointF(0, -bannerH / 2f),
                new PointF(0, bannerH / 2f),
                Color.FromArgb(255, 185, 28, 28),
                Color.FromArgb(255, 69, 10, 10)))
            {
                g.FillPath(bGrad, bPath);
            }

            // Gold Ribbon Border
            using (Pen goldPen = new Pen(Color.FromArgb(255, 251, 191, 36), 3.5f))
            {
                g.DrawPath(goldPen, bPath);
            }

            // Inner top highlight bar
            using (GraphicsPath hiPath = CreateRoundedRectangle(-bannerW / 2f + 4f, -bannerH / 2f + 3f, bannerW - 8f, (bannerH / 2f) - 3f, 10f))
            using (SolidBrush hiBrush = new SolidBrush(Color.FromArgb(60, 255, 255, 255)))
            {
                g.FillPath(hiBrush, hiPath);
            }
        }

        // Banner Text: "DONKEY MASTER" & "UNO NO MERCY"
        using (StringFormat sf = new StringFormat { Alignment = StringAlignment.Center, LineAlignment = StringAlignment.Center })
        using (Font fontTop = new Font("Arial Black", 16f, FontStyle.Bold))
        using (Font fontSub = new Font("Arial Black", 11.5f, FontStyle.Bold))
        {
            // Drop shadows
            using (SolidBrush blackBrush = new SolidBrush(Color.FromArgb(220, 0, 0, 0)))
            {
                g.DrawString("DONKEY MASTER", fontTop, blackBrush, 1.5f, -12f, sf);
                g.DrawString("& UNO NO MERCY", fontSub, blackBrush, 1.5f, 17f, sf);
            }

            // Top text in bright gold
            using (SolidBrush goldText = new SolidBrush(Color.FromArgb(255, 254, 240, 138)))
            {
                g.DrawString("DONKEY MASTER", fontTop, goldText, 0, -14f, sf);
            }

            // Bottom text in fiery neon flame
            using (SolidBrush flameText = new SolidBrush(Color.FromArgb(255, 252, 165, 165)))
            {
                g.DrawString("& UNO NO MERCY", fontSub, flameText, 0, 16f, sf);
            }
        }
    }

    public static Bitmap RenderAppIcon(int size, string type)
    {
        Bitmap bmp = new Bitmap(size, size);
        using (Graphics g = Graphics.FromImage(bmp))
        {
            g.SmoothingMode = SmoothingMode.AntiAlias;
            g.InterpolationMode = InterpolationMode.HighQualityBicubic;
            g.PixelOffsetMode = PixelOffsetMode.HighQuality;
            g.TextRenderingHint = TextRenderingHint.ClearTypeGridFit;

            float scale = size / 512.0f;

            if (type == "foreground")
            {
                // Transparent background
                g.Clear(Color.Transparent);

                // Android adaptive icon foreground: safe area is center ~66% of the 108dp canvas
                float fgScale = scale * 0.72f;
                float cx = size / 2.0f;
                float cy = size / 2.0f;

                // Center glowing spotlight behind cards
                using (GraphicsPath glowPath = new GraphicsPath())
                {
                    glowPath.AddEllipse(cx - 150f * fgScale, cy - 150f * fgScale, 300f * fgScale, 300f * fgScale);
                    using (PathGradientBrush glowBrush = new PathGradientBrush(glowPath))
                    {
                        glowBrush.CenterColor = Color.FromArgb(170, 124, 58, 237);
                        glowBrush.SurroundColors = new Color[] { Color.FromArgb(0, 22, 7, 43) };
                        g.FillPath(glowBrush, glowPath);
                    }
                }

                // 1. Uno Card (Left tilted)
                GraphicsState s1 = g.Save();
                g.TranslateTransform(cx - 48f * fgScale, cy + 12f * fgScale);
                g.RotateTransform(-15f);
                g.ScaleTransform(fgScale * 1.05f, fgScale * 1.05f);
                DrawUnoCard(g, fgScale);
                g.Restore(s1);

                // 2. Donkey Card (Right tilted)
                GraphicsState s2 = g.Save();
                g.TranslateTransform(cx + 48f * fgScale, cy + 12f * fgScale);
                g.RotateTransform(14f);
                g.ScaleTransform(fgScale * 1.05f, fgScale * 1.05f);
                DrawDonkeyCard(g, fgScale);
                g.Restore(s2);

                // 3. Crown on top
                GraphicsState s3 = g.Save();
                g.TranslateTransform(cx, cy - 85f * fgScale);
                g.ScaleTransform(fgScale * 0.95f, fgScale * 0.95f);
                DrawCrown(g);
                g.Restore(s3);

                // 4. Bottom Banner
                GraphicsState s4 = g.Save();
                g.TranslateTransform(cx, cy + 130f * fgScale);
                g.ScaleTransform(fgScale * 0.95f, fgScale * 0.95f);
                DrawBottomBanner(g);
                g.Restore(s4);

                // Sparkles
                DrawSparkle(g, cx - 110f * fgScale, cy - 85f * fgScale, 20f * fgScale, Color.FromArgb(255, 253, 224, 71));
                DrawSparkle(g, cx + 115f * fgScale, cy - 70f * fgScale, 24f * fgScale, Color.FromArgb(255, 253, 224, 71));
                DrawSparkle(g, cx + 95f * fgScale, cy + 50f * fgScale, 16f * fgScale, Color.White);
            }
            else
            {
                // Full / Round Icon
                g.Clear(Color.Transparent);

                // Clipping shape
                using (GraphicsPath clipPath = (type == "round")
                    ? new GraphicsPath()
                    : CreateRoundedRectangle(3f * scale, 3f * scale, size - 6f * scale, size - 6f * scale, 105f * scale))
                {
                    if (type == "round")
                    {
                        clipPath.AddEllipse(3f * scale, 3f * scale, size - 6f * scale, size - 6f * scale);
                    }
                    g.SetClip(clipPath);

                    // Deep Royal Midnight Gradient Background
                    using (LinearGradientBrush bgBrush = new LinearGradientBrush(
                        new PointF(0, 0),
                        new PointF(size, size),
                        Color.FromArgb(255, 32, 9, 60),
                        Color.FromArgb(255, 12, 3, 24)))
                    {
                        g.FillRectangle(bgBrush, 0, 0, size, size);
                    }

                    // Radiant purple center glow
                    using (GraphicsPath spotPath = new GraphicsPath())
                    {
                        spotPath.AddEllipse(size * 0.05f, size * 0.05f, size * 0.9f, size * 0.9f);
                        using (PathGradientBrush spotBrush = new PathGradientBrush(spotPath))
                        {
                            spotBrush.CenterColor = Color.FromArgb(210, 109, 40, 217);
                            spotBrush.SurroundColors = new Color[] { Color.FromArgb(0, 15, 4, 30) };
                            g.FillPath(spotBrush, spotPath);
                        }
                    }

                    float cx = size / 2.0f;
                    float cy = size / 2.0f;

                    // 1. Uno Card (Left tilted)
                    GraphicsState s1 = g.Save();
                    g.TranslateTransform(cx - 52f * scale, cy + 8f * scale);
                    g.RotateTransform(-15f);
                    g.ScaleTransform(scale * 1.1f, scale * 1.1f);
                    DrawUnoCard(g, scale);
                    g.Restore(s1);

                    // 2. Donkey Card (Right tilted)
                    GraphicsState s2 = g.Save();
                    g.TranslateTransform(cx + 52f * scale, cy + 8f * scale);
                    g.RotateTransform(14f);
                    g.ScaleTransform(scale * 1.1f, scale * 1.1f);
                    DrawDonkeyCard(g, scale);
                    g.Restore(s2);

                    // 3. Crown on top
                    GraphicsState s3 = g.Save();
                    g.TranslateTransform(cx, cy - 98f * scale);
                    g.ScaleTransform(scale * 1.0f, scale * 1.0f);
                    DrawCrown(g);
                    g.Restore(s3);

                    // 4. Bottom Banner
                    GraphicsState s4 = g.Save();
                    g.TranslateTransform(cx, cy + 148f * scale);
                    g.ScaleTransform(scale * 1.05f, scale * 1.05f);
                    DrawBottomBanner(g);
                    g.Restore(s4);

                    // Sparkles
                    DrawSparkle(g, cx - 145f * scale, cy - 95f * scale, 26f * scale, Color.FromArgb(255, 253, 224, 71));
                    DrawSparkle(g, cx + 148f * scale, cy - 80f * scale, 28f * scale, Color.FromArgb(255, 253, 224, 71));
                    DrawSparkle(g, cx - 130f * scale, cy + 65f * scale, 18f * scale, Color.White);
                    DrawSparkle(g, cx + 130f * scale, cy + 75f * scale, 22f * scale, Color.FromArgb(255, 253, 224, 71));

                    g.ResetClip();

                    // Metallic Gold Border
                    if (type == "round")
                    {
                        using (Pen rimPen = new Pen(Color.FromArgb(255, 234, 179, 8), 12f * scale))
                        {
                            g.DrawEllipse(rimPen, 6f * scale, 6f * scale, size - 12f * scale, size - 12f * scale);
                        }
                        using (Pen innerRim = new Pen(Color.FromArgb(190, 254, 240, 138), 2.5f * scale))
                        {
                            g.DrawEllipse(innerRim, 13f * scale, 13f * scale, size - 26f * scale, size - 26f * scale);
                        }
                    }
                    else
                    {
                        using (GraphicsPath borderPath = CreateRoundedRectangle(6f * scale, 6f * scale, size - 12f * scale, size - 12f * scale, 100f * scale))
                        using (Pen rimPen = new Pen(Color.FromArgb(255, 234, 179, 8), 12f * scale))
                        {
                            g.DrawPath(rimPen, borderPath);
                        }
                        using (GraphicsPath innerBorder = CreateRoundedRectangle(13f * scale, 13f * scale, size - 26f * scale, size - 26f * scale, 94f * scale))
                        using (Pen innerRim = new Pen(Color.FromArgb(190, 254, 240, 138), 2.5f * scale))
                        {
                            g.DrawPath(innerRim, innerBorder);
                        }
                    }
                }
            }
        }
        return bmp;
    }

    public static void Main(string[] args)
    {
        string rootDir = Directory.GetCurrentDirectory();
        Console.WriteLine("Generating high quality Donkey Master & UNO No Mercy icons...");

        // 1. Web Master Icon 512x512
        using (Bitmap web512 = RenderAppIcon(512, "full"))
        {
            string p1 = Path.Combine(rootDir, "client", "public", "icon.png");
            string p2 = Path.Combine(rootDir, "client", "public", "favicon.png");
            web512.Save(p1, System.Drawing.Imaging.ImageFormat.Png);
            web512.Save(p2, System.Drawing.Imaging.ImageFormat.Png);
            Console.WriteLine("Saved: " + p1);

            string sDir = Path.Combine(rootDir, "server", "public");
            if (Directory.Exists(sDir))
            {
                web512.Save(Path.Combine(sDir, "icon.png"), System.Drawing.Imaging.ImageFormat.Png);
                web512.Save(Path.Combine(sDir, "favicon.png"), System.Drawing.Imaging.ImageFormat.Png);
                Console.WriteLine("Saved: " + Path.Combine(sDir, "icon.png"));
            }
        }

        // 2. Android Density Icons
        var densities = new[]
        {
            new { Name = "mipmap-mdpi",    Icon = 48,  Fg = 108 },
            new { Name = "mipmap-hdpi",    Icon = 72,  Fg = 162 },
            new { Name = "mipmap-xhdpi",   Icon = 96,  Fg = 216 },
            new { Name = "mipmap-xxhdpi",  Icon = 144, Fg = 324 },
            new { Name = "mipmap-xxxhdpi", Icon = 192, Fg = 432 }
        };

        string resDir = Path.Combine(rootDir, "client", "android", "app", "src", "main", "res");

        foreach (var d in densities)
        {
            string targetDir = Path.Combine(resDir, d.Name);
            Directory.CreateDirectory(targetDir);

            // ic_launcher.png (squircle)
            using (Bitmap ic = RenderAppIcon(d.Icon, "full"))
            {
                ic.Save(Path.Combine(targetDir, "ic_launcher.png"), System.Drawing.Imaging.ImageFormat.Png);
            }

            // ic_launcher_round.png (circular)
            using (Bitmap icRound = RenderAppIcon(d.Icon, "round"))
            {
                icRound.Save(Path.Combine(targetDir, "ic_launcher_round.png"), System.Drawing.Imaging.ImageFormat.Png);
            }

            // ic_launcher_foreground.png (transparent adaptive foreground)
            using (Bitmap fg = RenderAppIcon(d.Fg, "foreground"))
            {
                fg.Save(Path.Combine(targetDir, "ic_launcher_foreground.png"), System.Drawing.Imaging.ImageFormat.Png);
            }

            Console.WriteLine("Successfully created icons for " + d.Name + " (" + d.Icon + "x" + d.Icon + ", fg: " + d.Fg + "x" + d.Fg + ")");
        }

        Console.WriteLine("All application icons generated successfully!");
    }
}
