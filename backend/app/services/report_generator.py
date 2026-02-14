"""
Report generation service for creating professional DOCX and PDF reports
"""
try:
    from docx import Document
    from docx.shared import Inches, Pt, RGBColor
    from docx.enum.text import WD_ALIGN_PARAGRAPH
except ImportError:
    print("Warning: python-docx not installed. Install with: pip install python-docx")
    Document = None
from reportlab.lib.pagesizes import letter
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import inch
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, PageBreak
from reportlab.lib import colors
from reportlab.lib.enums import TA_CENTER, TA_LEFT
from datetime import datetime
from typing import Dict, List
import os


class ReportGenerator:
    
    @staticmethod
    def generate_docx_report(analysis_data: Dict, output_path: str):
        """Generate a professional DOCX report"""
        
        doc = Document()
        
        # Title
        title = doc.add_heading('WorkScanAI Analysis Report', 0)
        title.alignment = WD_ALIGN_PARAGRAPH.CENTER
        
        # Metadata
        doc.add_paragraph(f"Generated: {datetime.now().strftime('%B %d, %Y at %I:%M %p')}")
        doc.add_paragraph(f"Workflow: {analysis_data['workflow']['name']}")
        if analysis_data['workflow'].get('description'):
            doc.add_paragraph(f"Description: {analysis_data['workflow']['description']}")
        doc.add_paragraph()
        
        # Executive Summary
        doc.add_heading('Executive Summary', 1)
        
        summary_table = doc.add_table(rows=4, cols=2)
        summary_table.style = 'Light Grid Accent 1'
        
        summary_data = [
            ('Overall Automation Score', f"{analysis_data['automation_score']:.1f}/100"),
            ('Annual Time Savings', f"{analysis_data['hours_saved']:.1f} hours"),
            ('Annual Cost Savings', f"${analysis_data['annual_savings']:,.2f}"),
            ('Total Tasks Analyzed', str(len(analysis_data['results'])))
        ]
        
        for i, (label, value) in enumerate(summary_data):
            summary_table.rows[i].cells[0].text = label
            summary_table.rows[i].cells[1].text = value
            summary_table.rows[i].cells[0].paragraphs[0].runs[0].font.bold = True
        
        doc.add_paragraph()
        
        # Key Insights
        doc.add_heading('Key Insights', 1)
        
        high_potential_tasks = [r for r in analysis_data['results'] if r['ai_readiness_score'] >= 70]
        medium_potential_tasks = [r for r in analysis_data['results'] if 40 <= r['ai_readiness_score'] < 70]
        low_potential_tasks = [r for r in analysis_data['results'] if r['ai_readiness_score'] < 40]
        
        doc.add_paragraph(f"✓ {len(high_potential_tasks)} tasks have HIGH automation potential (70+ score)", style='List Bullet')
        doc.add_paragraph(f"✓ {len(medium_potential_tasks)} tasks have MEDIUM automation potential (40-70 score)", style='List Bullet')
        doc.add_paragraph(f"✓ {len(low_potential_tasks)} tasks have LOW automation potential (<40 score)", style='List Bullet')
        doc.add_paragraph()
        
        # Detailed Task Analysis
        doc.add_heading('Detailed Task Analysis', 1)
        
        # Sort tasks by automation score (highest first)
        sorted_results = sorted(analysis_data['results'], key=lambda x: x['ai_readiness_score'], reverse=True)
        
        for idx, result in enumerate(sorted_results, 1):
            task = result['task']
            
            # Task header
            task_heading = doc.add_heading(f"Task {idx}: {task['name']}", 2)
            
            # Task details table
            task_table = doc.add_table(rows=7, cols=2)
            task_table.style = 'Light Shading Accent 1'
            
            # Determine automation recommendation
            score = result['ai_readiness_score']
            if score >= 70:
                automation_recommendation = "HIGH - Strong candidate for automation"
                color_indicator = "🟢"
            elif score >= 40:
                automation_recommendation = "MEDIUM - Partial automation recommended"
                color_indicator = "🟡"
            else:
                automation_recommendation = "LOW - Requires human judgment"
                color_indicator = "🔴"
            
            task_details = [
                ('Description', task.get('description', 'N/A')),
                ('Frequency', task.get('frequency', 'N/A').capitalize()),
                ('Time per Task', f"{task.get('time_per_task', 0)} minutes"),
                ('Category', task.get('category', 'N/A').replace('_', ' ').title()),
                ('Complexity', task.get('complexity', 'N/A').capitalize()),
                ('AI Readiness Score', f"{color_indicator} {score:.1f}/100"),
                ('Automation Potential', automation_recommendation)
            ]
            
            for i, (label, value) in enumerate(task_details):
                task_table.rows[i].cells[0].text = label
                task_table.rows[i].cells[1].text = value
                task_table.rows[i].cells[0].paragraphs[0].runs[0].font.bold = True
            
            # Recommendation
            if result.get('recommendation'):
                doc.add_paragraph('Recommendation:', style='Intense Quote')
                rec_para = doc.add_paragraph(result['recommendation'])
                rec_para.style = 'Quote'
            
            # Implementation difficulty
            if result.get('difficulty'):
                difficulty = result['difficulty'].title()
                diff_text = f"Implementation Difficulty: {difficulty}"
                if difficulty == 'Easy':
                    diff_text += " - Can be set up with no-code tools (Zapier, Make.com, etc.)"
                elif difficulty == 'Medium':
                    diff_text += " - Requires some technical setup (APIs, scripts)"
                else:
                    diff_text += " - Requires custom development and expertise"
                doc.add_paragraph(diff_text)
            
            # Time and cost savings
            if result.get('estimated_hours_saved'):
                hours = result['estimated_hours_saved']
                hourly_rate = analysis_data.get('hourly_rate', 50)
                annual_value = hours * hourly_rate
                doc.add_paragraph(f"Estimated Annual Savings: {hours:.1f} hours (${annual_value:,.2f})")
            
            doc.add_paragraph()
        
        # Implementation Roadmap
        doc.add_page_break()
        doc.add_heading('Recommended Implementation Roadmap', 1)
        
        doc.add_heading('Phase 1: Quick Wins (0-3 months)', 2)
        quick_wins = [r for r in sorted_results if r['ai_readiness_score'] >= 70 and r.get('difficulty', '').lower() == 'easy']
        if quick_wins:
            for result in quick_wins:
                doc.add_paragraph(f"• {result['task']['name']} - {result['recommendation']}", style='List Bullet')
        else:
            doc.add_paragraph("No immediate quick wins identified. Focus on medium-complexity tasks.", style='List Bullet')
        
        doc.add_heading('Phase 2: Medium-Term Automation (3-6 months)', 2)
        medium_term = [r for r in sorted_results if r['ai_readiness_score'] >= 50 and r.get('difficulty', '').lower() == 'medium']
        if medium_term:
            for result in medium_term:
                doc.add_paragraph(f"• {result['task']['name']} - {result['recommendation']}", style='List Bullet')
        else:
            doc.add_paragraph("Consider advanced automation for high-value tasks.", style='List Bullet')
        
        doc.add_heading('Phase 3: Advanced Automation (6-12 months)', 2)
        advanced = [r for r in sorted_results if r['ai_readiness_score'] >= 40 and r.get('difficulty', '').lower() == 'hard']
        if advanced:
            for result in advanced:
                doc.add_paragraph(f"• {result['task']['name']} - {result['recommendation']}", style='List Bullet')
        else:
            doc.add_paragraph("Focus on continuous improvement and optimization of existing automations.", style='List Bullet')
        
        # Conclusion
        doc.add_page_break()
        doc.add_heading('Conclusion', 1)
        
        conclusion_text = f"""
This analysis has identified significant automation opportunities within your {analysis_data['workflow']['name']} workflow. 
By implementing the recommended automation strategies, you can potentially save {analysis_data['hours_saved']:.1f} hours 
annually, equivalent to approximately ${analysis_data['annual_savings']:,.2f} in cost savings.

Key Recommendations:
1. Start with the high-scoring, low-difficulty tasks for quick wins
2. Build momentum with successful automations before tackling complex tasks
3. Consider a human-in-the-loop approach for tasks requiring judgment
4. Regularly review and optimize automated processes
5. Train team members on new automated workflows

Next Steps:
- Review this report with your team
- Prioritize tasks based on business impact and resource availability
- Begin implementation with Phase 1 quick wins
- Track metrics to measure automation success
- Schedule quarterly reviews to identify new automation opportunities
"""
        
        for para in conclusion_text.strip().split('\n\n'):
            if para.strip():
                doc.add_paragraph(para.strip())
        
        # Footer
        doc.add_paragraph()
        footer_para = doc.add_paragraph('Generated by WorkScanAI - AI-Powered Workflow Analysis')
        footer_para.alignment = WD_ALIGN_PARAGRAPH.CENTER
        footer_para.runs[0].font.size = Pt(10)
        footer_para.runs[0].font.color.rgb = RGBColor(128, 128, 128)
        
        # Save document
        doc.save(output_path)
        return output_path
    
    @staticmethod
    def generate_pdf_report(analysis_data: Dict, output_path: str):
        """Generate a professional PDF report"""
        
        doc = SimpleDocTemplate(output_path, pagesize=letter,
                               leftMargin=0.75*inch, rightMargin=0.75*inch,
                               topMargin=1*inch, bottomMargin=0.75*inch)
        
        styles = getSampleStyleSheet()
        story = []
        
        # Custom styles
        title_style = ParagraphStyle(
            'CustomTitle',
            parent=styles['Title'],
            fontSize=24,
            textColor=colors.HexColor('#1e40af'),
            spaceAfter=30,
            alignment=TA_CENTER
        )
        
        heading1_style = ParagraphStyle(
            'CustomHeading1',
            parent=styles['Heading1'],
            fontSize=16,
            textColor=colors.HexColor('#1e40af'),
            spaceAfter=12,
            spaceBefore=12
        )
        
        # Title
        story.append(Paragraph('WorkScanAI Analysis Report', title_style))
        story.append(Spacer(1, 12))
        
        # Metadata
        metadata = f"""
        <b>Generated:</b> {datetime.now().strftime('%B %d, %Y at %I:%M %p')}<br/>
        <b>Workflow:</b> {analysis_data['workflow']['name']}<br/>
        """
        if analysis_data['workflow'].get('description'):
            metadata += f"<b>Description:</b> {analysis_data['workflow']['description']}<br/>"
        
        story.append(Paragraph(metadata, styles['Normal']))
        story.append(Spacer(1, 20))
        
        # Executive Summary
        story.append(Paragraph('Executive Summary', heading1_style))
        
        summary_data = [
            ['Overall Automation Score', f"{analysis_data['automation_score']:.1f}/100"],
            ['Annual Time Savings', f"{analysis_data['hours_saved']:.1f} hours"],
            ['Annual Cost Savings', f"${analysis_data['annual_savings']:,.2f}"],
            ['Total Tasks Analyzed', str(len(analysis_data['results']))]
        ]
        
        summary_table = Table(summary_data, colWidths=[3*inch, 2.5*inch])
        summary_table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, -1), colors.HexColor('#f0f9ff')),
            ('TEXTCOLOR', (0, 0), (-1, -1), colors.black),
            ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
            ('FONTNAME', (0, 0), (0, -1), 'Helvetica-Bold'),
            ('FONTSIZE', (0, 0), (-1, -1), 11),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 12),
            ('TOPPADDING', (0, 0), (-1, -1), 12),
            ('GRID', (0, 0), (-1, -1), 1, colors.HexColor('#bfdbfe'))
        ]))
        
        story.append(summary_table)
        story.append(Spacer(1, 20))
        
        # Task Analysis Summary
        story.append(Paragraph('Task Analysis Summary', heading1_style))
        
        high_potential_tasks = [r for r in analysis_data['results'] if r['ai_readiness_score'] >= 70]
        medium_potential_tasks = [r for r in analysis_data['results'] if 40 <= r['ai_readiness_score'] < 70]
        low_potential_tasks = [r for r in analysis_data['results'] if r['ai_readiness_score'] < 40]
        
        summary_text = f"""
        • <b>{len(high_potential_tasks)}</b> tasks have HIGH automation potential (70+ score)<br/>
        • <b>{len(medium_potential_tasks)}</b> tasks have MEDIUM automation potential (40-70 score)<br/>
        • <b>{len(low_potential_tasks)}</b> tasks have LOW automation potential (&lt;40 score)
        """
        
        story.append(Paragraph(summary_text, styles['Normal']))
        story.append(Spacer(1, 20))
        
        # Detailed task analysis
        story.append(PageBreak())
        story.append(Paragraph('Detailed Task Analysis', heading1_style))
        
        sorted_results = sorted(analysis_data['results'], key=lambda x: x['ai_readiness_score'], reverse=True)
        
        for idx, result in enumerate(sorted_results, 1):
            task = result['task']
            score = result['ai_readiness_score']
            
            # Task heading
            task_heading = f"Task {idx}: {task['name']}"
            story.append(Paragraph(task_heading, styles['Heading2']))
            
            # Task details
            details_text = f"""
            <b>Description:</b> {task.get('description', 'N/A')}<br/>
            <b>Frequency:</b> {task.get('frequency', 'N/A').capitalize()}<br/>
            <b>Time per Task:</b> {task.get('time_per_task', 0)} minutes<br/>
            <b>AI Readiness Score:</b> {score:.1f}/100<br/>
            """
            
            if result.get('recommendation'):
                details_text += f"<b>Recommendation:</b> {result['recommendation']}<br/>"
            
            if result.get('estimated_hours_saved'):
                hours = result['estimated_hours_saved']
                hourly_rate = analysis_data.get('hourly_rate', 50)
                annual_value = hours * hourly_rate
                details_text += f"<b>Estimated Annual Savings:</b> {hours:.1f} hours (${annual_value:,.2f})"
            
            story.append(Paragraph(details_text, styles['Normal']))
            story.append(Spacer(1, 15))
        
        # Build PDF
        doc.build(story)
        return output_path
