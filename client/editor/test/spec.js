const chai     = require('chai')
const chaiHtml = require('chai-html')

// babel-register is needed as the sub-modules are written in ECMASCript 2015
// and mocha won't be able to read them currently.
// It's not possible to specify a loader for the tests on the mocha
// command line without it applying it ALL the tests (it should only
// apply to these tests)
// Don't convert built files
require('babel-register', {ignore: /build/})

const {
	stripEmptyTags,
	processLinks,
	processFigures,
	processHeadings,
	processAsides,
	processTables,
	processLists} = require("../msword_normalizer.js")

const expect = chai.expect
chai.use(chaiHtml)

describe("Editor", () => {
	describe("MS-Word normalizer", () => {
		describe("stripEmptyTags", () => {
			it("should strip empty tags", () => {
				expect(stripEmptyTags("<o:p></o:p>")).html.to.equal("")
			})

			it("should retain non-empty tags", () => {
				expect(stripEmptyTags("<o:p>Foo</o:p>")).html.to.equal("<o:p>Foo</o:p>")
			})

			it("should strip empty tags that have attributes", () => {
				expect(stripEmptyTags("<o:p style='color: red'></o:p>")).html.to.equal("")
			})

			it("should strip nested empty tags", () => {
				expect(stripEmptyTags("<p><span></span><o:p></o:p></p>")).html.to.equal("")
			})

			it("should correctly process a complex example", () => {
				expect(stripEmptyTags(`
					<div>
						<h1>A</h1>
						<p class=MsoHeader style='text-align:justify;tab-stops:.5in'><span
						style='mso-bookmark:OLE_LINK1'><span style='mso-bookmark:OLE_LINK2'><span
						style='mso-bookmark:OLE_LINK3'><o:p>&nbsp;</o:p></span> <o:p>   </o:p></span></span></p>
					</div>`)
				).html.to.equal(`
					<div>
						<h1>A</h1>
					</div>
				`)
			})
		})

		describe("processLists", () => {
			it("should convert paragraphs with list bullets into list items", () => {
				expect(processLists(`
					<p>A</p>
					<p><span style="mso-list:Ignore">.</span>C</p>
					<p><span style="mso-list:Ignore">.</span>D</p>
				`)).html.to.equal(`
					<p>A</p>
					<ul>
						<li>C</li>
						<li>D</li>
					</ul>
				`)
			})

			it("should correctly process two separate paragraphs", () => {
				expect(processLists(`
					<p>A</p>
					<p><span style="mso-list:Ignore">.</span>C</p>
					<p><span style="mso-list:Ignore">.</span>D</p>
					<p>B</p>
					<p><span style="mso-list:Ignore">.</span>E</p>
					<p><span style="mso-list:Ignore">.</span>F</p>
				`)).html.to.equal(`
					<p>A</p>
					<ul>
						<li>C</li>
						<li>D</li>
					</ul>
					<p>B</p>
					<ul>
						<li>E</li>
						<li>F</li>
					</ul>
				`)
			})

			it("should correctly process a complex example", () => {
				expect(processLists(`
					<p class=MsoNoSpacing>To start with, there is not even a clear cut and simple definition
					of the meaning of the term ‘alcoholism’ – or better: ‘alcohol dependence’ (and
					since 2013 as the preferred term ‘alcohol use disorder’). <o:p></o:p></p>
					<p class=MsoNoSpacing>Several criteria have been collated:<o:p></o:p></p>
					<p class=MsoNoSpacing style='margin-left:.5in;text-indent:-.25in;mso-list:l0 level1 lfo1'><![if !supportLists]><span
					style='font-family:Wingdings;mso-fareast-font-family:Wingdings;mso-bidi-font-family:
					Wingdings'><span style='mso-list:Ignore'>Ø<span style='font:7.0pt \"Times New Roman\"'>&nbsp;
					</span></span></span><![endif]>Developing tolerance (see below)<o:p></o:p></p>
					<p class=MsoNoSpacing style='margin-left:.5in;text-indent:-.25in;mso-list:l0 level1 lfo1'><![if !supportLists]><span
					style='font-family:Wingdings;mso-fareast-font-family:Wingdings;mso-bidi-font-family:
					Wingdings'><span style='mso-list:Ignore'>Ø<span style='font:7.0pt \"Times New Roman\"'>&nbsp;
					</span></span></span><![endif]>Withdrawal symptoms (see below)<o:p></o:p></p>
					<p class=MsoNoSpacing style='margin-left:.5in;text-indent:-.25in;mso-list:l0 level1 lfo1'><![if !supportLists]><span
					style='font-family:Wingdings;mso-fareast-font-family:Wingdings;mso-bidi-font-family:
					Wingdings'><span style='mso-list:Ignore'>Ø<span style='font:7.0pt \"Times New Roman\"'>&nbsp;
					</span></span></span><![endif]>Using larger amounts than intended<o:p></o:p></p>
					<p class=MsoNoSpacing style='margin-left:.5in;text-indent:-.25in;mso-list:l0 level1 lfo1'><![if !supportLists]><span
					style='font-family:Wingdings;mso-fareast-font-family:Wingdings;mso-bidi-font-family:
					Wingdings'><span style='mso-list:Ignore'>Ø<span style='font:7.0pt \"Times New Roman\"'>&nbsp;
					</span></span></span><![endif]>Inability to reduce consumption<o:p></o:p></p>
					<p class=MsoNoSpacing style='margin-left:.5in;text-indent:-.25in;mso-list:l0 level1 lfo1'><![if !supportLists]><span
					style='font-family:Wingdings;mso-fareast-font-family:Wingdings;mso-bidi-font-family:
					Wingdings'><span style='mso-list:Ignore'>Ø<span style='font:7.0pt \"Times New Roman\"'>&nbsp;
					</span></span></span><![endif]>Disproportionate amounts of time dedicated to
					sourcing alcohol and/or suffering from hang-over<o:p></o:p></p>
					<p class=MsoNoSpacing style='margin-left:.5in;text-indent:-.25in;mso-list:l0 level1 lfo1'><![if !supportLists]><span
					style='font-family:Wingdings;mso-fareast-font-family:Wingdings;mso-bidi-font-family:
					Wingdings'><span style='mso-list:Ignore'>Ø<span style='font:7.0pt \"Times New Roman\"'>&nbsp;
					</span></span></span><![endif]>Increasing social isolation due to alcohol
					consumption<o:p></o:p></p>
					<p class=MsoNoSpacing style='margin-left:.5in;text-indent:-.25in;mso-list:l0 level1 lfo1'><![if !supportLists]><span
					style='font-family:Wingdings;mso-fareast-font-family:Wingdings;mso-bidi-font-family:
					Wingdings'><span style='mso-list:Ignore'>Ø<span style='font:7.0pt \"Times New Roman\"'>&nbsp;
					</span></span></span><![endif]>Continued excessive use despite knowledge about
					harm. <o:p></o:p></p>
					<p class=MsoNoSpacing>There seems to be agreement that if at least three of
					these criteria are fulfilled over a period of at least twelve months, this is an
					indication of alcohol dependence. This approach certainly is an indication that
					the story of EtOH as an addictive recreational drug is indeed complicated, with
					a high degree of individual variability.<o:p></o:p></p>
				`)).html.to.equal(`
					<p class=MsoNoSpacing>To start with, there is not even a clear cut and simple definition
					of the meaning of the term ‘alcoholism’ – or better: ‘alcohol dependence’ (and
					since 2013 as the preferred term ‘alcohol use disorder’). <o:p></o:p></p>
					<p class=MsoNoSpacing>Several criteria have been collated:<o:p></o:p></p>
					<ul>
					<li><![if !supportLists]><span
					style='font-family:Wingdings;mso-fareast-font-family:Wingdings;mso-bidi-font-family:
					Wingdings'></span></span><![endif]>Developing tolerance (see below)<o:p></o:p></li>
					<li><![if !supportLists]><span
					style='font-family:Wingdings;mso-fareast-font-family:Wingdings;mso-bidi-font-family:
					Wingdings'></span></span><![endif]>Withdrawal symptoms (see below)<o:p></o:p></li>
					<li><![if !supportLists]><span
					style='font-family:Wingdings;mso-fareast-font-family:Wingdings;mso-bidi-font-family:
					Wingdings'></span></span><![endif]>Using larger amounts than intended<o:p></o:p></li>
					<li><![if !supportLists]><span
					style='font-family:Wingdings;mso-fareast-font-family:Wingdings;mso-bidi-font-family:
					Wingdings'></span></span><![endif]>Inability to reduce consumption<o:p></o:p></li>
					<li><![if !supportLists]><span
					style='font-family:Wingdings;mso-fareast-font-family:Wingdings;mso-bidi-font-family:
					Wingdings'></span></span><![endif]>Disproportionate amounts of time dedicated to
					sourcing alcohol and/or suffering from hang-over<o:p></o:p></li>
					<li><![if !supportLists]><span
					style='font-family:Wingdings;mso-fareast-font-family:Wingdings;mso-bidi-font-family:
					Wingdings'></span></span><![endif]>Increasing social isolation due to alcohol
					consumption<o:p></o:p></li>
					<li><![if !supportLists]><span
					style='font-family:Wingdings;mso-fareast-font-family:Wingdings;mso-bidi-font-family:
					Wingdings'></span></span><![endif]>Continued excessive use despite knowledge about
					harm. <o:p></o:p></li>
					</ul>
					<p class=MsoNoSpacing>There seems to be agreement that if at least three of
					these criteria are fulfilled over a period of at least twelve months, this is an
					indication of alcohol dependence. This approach certainly is an indication that
					the story of EtOH as an addictive recreational drug is indeed complicated, with
					a high degree of individual variability.<o:p></o:p></p>
				`)
			})
		})

		describe("processAsides", () => {
			it("should nest green paragraphs inside asides", () => {
				expect(processAsides(`
					<p><span style="color:#00B050">Something</span></p>
				`)).html.to.equal(`
					<aside><p><span>Something</span></p></aside>
				`)
			})

			it("should correctly process a complex example", () => {
				expect(processAsides(`
					<p class=MsoNormal><span style='font-size:12.0pt;line-height:107%'><o:p>&nbsp;</o:p></span></p>
					<p class=MsoNormal><span style='font-size:12.0pt;line-height:107%;color:#00B050'>Our
					video demonstrations show how one can best, safely and most efficiently provide oral hygiene home
					care for oneself, for a wide range of circumstances</span><span
					style='font-size:12.0pt;line-height:107%;color:red'>[help-selfhelp-oral-hygiene-video-preamble]<o:p></o:p></span></p>
				`)).html.to.equal(`
					<p class=MsoNormal><span style='font-size:12.0pt;line-height:107%'><o:p>&nbsp;</o:p></span></p>
					<aside><p><span>Our
					video demonstrations show how one can best, safely and most efficiently provide oral hygiene home
					care for oneself, for a wide range of circumstances</span><span
					style='font-size:12.0pt;line-height:107%;color:red'>[help-selfhelp-oral-hygiene-video-preamble]<o:p></o:p></p></aside>
				`)
				
			})
		})

		describe("processHeadings", () => {
			it("should replace centred paragraphs with h1", () => {
				expect(processHeadings(`
					<p style="text-align:center">A</p>
				`)).html.to.equal(`
					<h1>A</h1>
				`)
			})

			it("should strip b tags out of h1s (replace with spans)", () => {
				expect(processHeadings(`
					<p style="text-align:center"><b>A</b></p>
				`)).html.to.equal(`
					<h1><span>A</span></h1>
				`)
			})

			it("should replaced paragraphs with solo b children with h2", () => {
				expect(processHeadings(`
					<p><b>B</b></p>
				`)).html.to.equal(`
					<h2>B</h2>
				`)
			})

			it("should ignore bs in paragraphs where they are not solo", () => {
				expect(processHeadings(`
					<p><b>B</b> <b>C</b></p>
				`)).html.to.equal(`
					<p><b>B</b> <b>C</b></p>
				`)
			})

			it("should correctly process a complex example", () => {
				expect(processHeadings(`
					<p style='text-align:center'><span
					style='mso-bookmark:OLE_LINK1'><span style='mso-bookmark:OLE_LINK2'><span
					style='mso-bookmark:OLE_LINK3'><b style='mso-bidi-font-weight:normal'><span
					style='font-size:12.0pt;line-height:107%;font-family:Arial'>Locations of
					fractures; incidence and aetiology<o:p></o:p></span></b></span></span></span></p>
					<p class=MsoNormal><span style='mso-bookmark:OLE_LINK1'><span style='mso-bookmark:
					OLE_LINK2'><span style='mso-bookmark:OLE_LINK3'><b style='mso-bidi-font-weight:
					normal'><span style='font-size:12.0pt;line-height:107%;font-family:Arial'>Mandibular
					fractures (fractures of the lower jaw)<o:p></o:p></span></b></span></span></span></p>
					<p class=MsoHeader style='tab-stops:.5in'><span style='mso-bookmark:OLE_LINK1'><span
					style='mso-bookmark:OLE_LINK2'><span style='mso-bookmark:OLE_LINK3'>Fractures
					of the mandible account for 20% of all facial bone fractures.<b
					style='mso-bidi-font-weight:normal'> </b>80% of these are in males.<b
					style='mso-bidi-font-weight:normal'><span style='mso-spacerun:yes'>
					</span><o:p></o:p></b></span></span></span></p>
				`)).html.to.equal(`
					<h1><span
					style='mso-bookmark:OLE_LINK1'><span style='mso-bookmark:OLE_LINK2'><span
					style='mso-bookmark:OLE_LINK3'><span style='mso-bidi-font-weight:normal'><span
					style='font-size:12.0pt;line-height:107%;font-family:Arial'>Locations of
					fractures; incidence and aetiology<o:p></o:p></span></span></span></span></span></h1>
					<h2 class=MsoNormal><span style='font-size:12.0pt;line-height:107%;font-family:Arial'>Mandibular
					fractures (fractures of the lower jaw)<o:p></o:p></span></h2>
					<p class=MsoHeader style='tab-stops:.5in'><span style='mso-bookmark:OLE_LINK1'><span
					style='mso-bookmark:OLE_LINK2'><span style='mso-bookmark:OLE_LINK3'>Fractures
					of the mandible account for 20% of all facial bone fractures.<b
					style='mso-bidi-font-weight:normal'> </b>80% of these are in males.<b
					style='mso-bidi-font-weight:normal'><span style='mso-spacerun:yes'>
					</span><o:p></o:p></b></span></span></span></p>
				`)
			})
		})

		describe("processTables", () => {
			it("should strip redundant paragraphs from within table cells", () => {
				expect(processTables(`
					<td><p>A</p></td>
				`)).html.to.equal(`
					<td><span>A</span></td>
				`)
			})

			it("should turn cells with entirely bold text into header cells", () => {
				expect(processTables(`
					<td><p><b>A</b></p></td>
				`)).html.to.equal(`
					<th><span>A</span></th>
				`)
			})

			it("should insert captions into tables", () => {
				expect(processTables(`
					<p><span>Table 3: Some caption</span></p>
					<table><tr><td></td></tr></table>
				`)).html.to.equal(`
					<table><caption><span>Table 3: Some caption</span></caption><tr><td></td></tr></table>
				`)
			})

			it("should correctly process a complex example", () => {
				expect(processTables(`
					<table class=MsoTableGrid border=1 cellspacing=0 cellpadding=0
					 style='border-collapse:collapse;border:none;mso-border-alt:solid windowtext .5pt;
					 mso-yfti-tbllook:1184;mso-padding-alt:0in 5.4pt 0in 5.4pt'>
					 <tr style='mso-yfti-irow:0;mso-yfti-firstrow:yes'>
					  <td width=231 valign=top style='width:231.05pt;border:solid windowtext 1.0pt;
					  mso-border-alt:solid windowtext .5pt;padding:0in 5.4pt 0in 5.4pt'>
					  <p class=MsoNoSpacing><span style='mso-bookmark:OLE_LINK1'><span
					  style='mso-bookmark:OLE_LINK2'><b style='mso-bidi-font-weight:normal'>Blood
					  alcohol content /vol. %<o:p></o:p></b></span></span></p>
					  </td>
					  <span style='mso-bookmark:OLE_LINK1'><span style='mso-bookmark:OLE_LINK2'></span></span>
					  <td width=231 valign=top style='width:231.05pt;border:solid windowtext 1.0pt;
					  border-left:none;mso-border-left-alt:solid windowtext .5pt;mso-border-alt:
					  solid windowtext .5pt;padding:0in 5.4pt 0in 5.4pt'>
					  <p class=MsoNoSpacing><span style='mso-bookmark:OLE_LINK1'><span
					  style='mso-bookmark:OLE_LINK2'><b style='mso-bidi-font-weight:normal'>Typical
					  effects<o:p></o:p></b></span></span></p>
					  </td>
					  <span style='mso-bookmark:OLE_LINK1'><span style='mso-bookmark:OLE_LINK2'></span></span>
					 </tr>
					 <tr style='mso-yfti-irow:1'>
					  <td width=231 valign=top style='width:231.05pt;border:solid windowtext 1.0pt;
					  border-top:none;mso-border-top-alt:solid windowtext .5pt;mso-border-alt:solid windowtext .5pt;
					  padding:0in 5.4pt 0in 5.4pt'>
					  <p class=MsoNoSpacing><span style='mso-bookmark:OLE_LINK1'><span
					  style='mso-bookmark:OLE_LINK2'>0.02-0.03<o:p></o:p></span></span></p>
					  </td>
					  <span style='mso-bookmark:OLE_LINK1'><span style='mso-bookmark:OLE_LINK2'></span></span>
					  <td width=231 valign=top style='width:231.05pt;border-top:none;border-left:
					  none;border-bottom:solid windowtext 1.0pt;border-right:solid windowtext 1.0pt;
					  mso-border-top-alt:solid windowtext .5pt;mso-border-left-alt:solid windowtext .5pt;
					  mso-border-alt:solid windowtext .5pt;padding:0in 5.4pt 0in 5.4pt'>
					  <p class=MsoNoSpacing><span style='mso-bookmark:OLE_LINK1'><span
					  style='mso-bookmark:OLE_LINK2'>Elevated mood, slight muscle relaxation<o:p></o:p></span></span></p>
					  </td>
					  <span style='mso-bookmark:OLE_LINK1'><span style='mso-bookmark:OLE_LINK2'></span></span>
					 </tr>
					</table>
				`)).html.to.equal(`
					<table class=MsoTableGrid border=1 cellspacing=0 cellpadding=0
					 style='border-collapse:collapse;border:none;mso-border-alt:solid windowtext .5pt;
					 mso-yfti-tbllook:1184;mso-padding-alt:0in 5.4pt 0in 5.4pt'>
					 <tr style='mso-yfti-irow:0;mso-yfti-firstrow:yes'>
					  <th width=231 valign=top style='width:231.05pt;border:solid windowtext 1.0pt;
					  mso-border-alt:solid windowtext .5pt;padding:0in 5.4pt 0in 5.4pt'>
					  <span><span style='mso-bookmark:OLE_LINK1'><span
					  style='mso-bookmark:OLE_LINK2'>Blood
					  alcohol content /vol. %<o:p></o:p></span></span></span>
					  </th>
					  <span style='mso-bookmark:OLE_LINK1'><span style='mso-bookmark:OLE_LINK2'></span></span>
					  <th width=231 valign=top style='width:231.05pt;border:solid windowtext 1.0pt;
					  border-left:none;mso-border-left-alt:solid windowtext .5pt;mso-border-alt:
					  solid windowtext .5pt;padding:0in 5.4pt 0in 5.4pt'>
					  <span><span style='mso-bookmark:OLE_LINK1'><span
					  style='mso-bookmark:OLE_LINK2'>Typical
					  effects<o:p></o:p></span></span></span>
					  </th>
					  <span style='mso-bookmark:OLE_LINK1'><span style='mso-bookmark:OLE_LINK2'></span></span>
					 </tr>
					 <tr style='mso-yfti-irow:1'>
					  <td width=231 valign=top style='width:231.05pt;border:solid windowtext 1.0pt;
					  border-top:none;mso-border-top-alt:solid windowtext .5pt;mso-border-alt:solid windowtext .5pt;
					  padding:0in 5.4pt 0in 5.4pt'>
					  <span><span style='mso-bookmark:OLE_LINK1'><span
					  style='mso-bookmark:OLE_LINK2'>0.02-0.03<o:p></o:p></span></span></span>
					  </td>
					  <span style='mso-bookmark:OLE_LINK1'><span style='mso-bookmark:OLE_LINK2'></span></span>
					  <td width=231 valign=top style='width:231.05pt;border-top:none;border-left:
					  none;border-bottom:solid windowtext 1.0pt;border-right:solid windowtext 1.0pt;
					  mso-border-top-alt:solid windowtext .5pt;mso-border-left-alt:solid windowtext .5pt;
					  mso-border-alt:solid windowtext .5pt;padding:0in 5.4pt 0in 5.4pt'>
					  <span><span style='mso-bookmark:OLE_LINK1'><span
					  style='mso-bookmark:OLE_LINK2'>Elevated mood, slight muscle relaxation<o:p></o:p></span></span></span>
					  </td>
					  <span style='mso-bookmark:OLE_LINK1'><span style='mso-bookmark:OLE_LINK2'></span></span>
					 </tr>
					</table>
				`)
			})
		})

		describe("processFigures", () => {
			it("should replace blue paragraphs without caption with figure placeholders", () => {
				expect(processFigures(`
					<p>
						<span style='color:#00B0F0'>Figure 2 here {another-uri}</span>
					</p>
				`)).html.to.equal(`
					<figure>
						<img src="/another-uri">
						<figcaption><strong>Figure 2:</strong> </figcaption>
					</figure>
				`)
			})

			it("should replace blue adjacent paragraphs with figures", () => {
				const input = "<p><span style='color:#00B0F0'>Figure 1 {uri}</span></p><p><span style='color:#00B0F0'>Caption</span></p>"
				const expected = "<figure><img src=\"/uri\"><figcaption><strong>Figure 1:</strong> Caption</figcaption></figure>"

				expect(processFigures(input)).to.equal(expected)
			})

			it("should correctly process a complex example", () => {
				const input = `
					<p class=MsoNormal><span style='mso-bookmark:OLE_LINK1'><span style='mso-bookmark:
					OLE_LINK2'><span style='mso-bookmark:OLE_LINK3'><span style='font-size:12.0pt;
					line-height:107%;font-family:Arial;color:#00B0F0'>Figure 1
					{diagnosis-list-fracture-level2-figure1}<o:p></o:p></span></span></span></span></p>

					<p class=MsoNormal><span style='mso-bookmark:OLE_LINK1'><span style='mso-bookmark:
					OLE_LINK2'><span style='mso-bookmark:OLE_LINK3'><span style='font-size:12.0pt;
					line-height:107%;font-family:Arial;color:#00B0F0'>Abnormal mobility, bleeding
					and interdental space characteristic of a mandibular fracture. <span
					style='mso-spacerun:yes'></span><o:p></o:p></span></span></span></span></p>`
				const expected = `
					<figure><img src="/diagnosis-list-fracture-level2-figure1"><figcaption><strong>Figure 1:</strong> Abnormal mobility, bleeding
					and interdental space characteristic of a mandibular fracture. </figcaption></figure>
					`

				expect(processFigures(input)).html.to.equal(expected)
			})
		})

		describe("processLinks", () => {
			it("should replace red spans with links", () => {
				expect(processLinks("<span style='color:red'>A [b]</span>")).to.equal(`<a href="/b">A</a>`)
			})

			it("should join separated spans", () => {
				expect(processLinks(`
					<span style='color:red'>A</span> <span style='color:red'>[b]</span>
				`)).html.to.equal(`<a href="/b">A</a>`)
			})

			it("should join separated spans even if they are not neighbours logically (but are, visually)", () => {
				expect(processLinks(`
					<p><span><span style='color:red'>Link</span></span> <span><span style='color:red'>[href]</span></span></p>
				`)).html.to.equal(`
					<p><span><a href="/href">Link</a></span> <span></span></p>
				`)
			})

			it("should insert spaces where spaces would be eaten by spans", () => {
				expect(processLinks(`
					<p>
						The quick brown <span style='color:red'>fox [jumps] </span>over
					</p>
				`)).to.equal(`
					<p>
						The quick brown <a href="/jumps">fox</a> over
					</p>
				`)
			})

			it("should correctly process a complex example", () => {
				const input = `
					<span style='font-size:12.0pt;line-height:107%;font-family:Arial'>
						Confirmation of site and specific fracture pattern details are
						obtained from <span style='color:red'>X-ray
						[diagnosis-tests-Xray-level2]</span> images (by plain films at right angles)
						and <span style='color:red'>CT scans</span>
						<span style='color:red'>[diagnosis-tests-CT-level2]</span>.
						<span style='color:red'> </span>The imaging will help the
						surgeon plan the operation, find, realign the fragments and 
						avoid missing a fracture segment when operating. Additional
						suspected or evident injuries to soft tissues such as
						ligaments need to be investigated by <span
						style='color:red'>MRI scans [diagnosis-tests-MRI-level2]
						</span>.
						<o:p></o:p>
					</span>
				`

				const expected = `
					<span style="font-size:12.0pt;line-height:107%;font-family:Arial">
						Confirmation of site and specific fracture pattern details are
						obtained from <a href="/diagnosis-tests-Xray-level2">X-ray</a> images (by plain films at right angles)
						and <a href="/diagnosis-tests-CT-level2">CT scans</a>
						.
						<span style="color:red"> </span>The imaging will help the
						surgeon plan the operation, find, realign the fragments and 
						avoid missing a fracture segment when operating. Additional
						suspected or evident injuries to soft tissues such as
						ligaments need to be investigated by <a href="/diagnosis-tests-MRI-level2">MRI scans</a>.
						<o:p></o:p>
					</span>
				`

				expect(processLinks(input)).html.to.equal(expected)
			})
		})


	})
})
