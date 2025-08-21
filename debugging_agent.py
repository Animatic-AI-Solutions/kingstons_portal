#!/usr/bin/env python3
"""
Kingston's Portal System Debugging Agent

A specialized debugging tool for the Kingston's Portal wealth management system.
Expert in full-stack issue analysis across FastAPI backend, React frontend, and PostgreSQL database.

Usage:
    python debugging_agent.py --issue "description" [--component component_name] [--severity level]
    python debugging_agent.py --workflow workflow_name [--trace]
    python debugging_agent.py --performance [--analytics] [--database]
    python debugging_agent.py --auth [--cookies] [--jwt]
    python debugging_agent.py --interactive

Author: Kingston's Portal Development Team
"""

import os
import sys
import argparse
import json
import re
import subprocess
from datetime import datetime
from pathlib import Path
from typing import Dict, List, Optional, Tuple, Any
from dataclasses import dataclass, asdict
from enum import Enum

class Severity(Enum):
    CRITICAL = "critical"
    HIGH = "high"  
    MEDIUM = "medium"
    LOW = "low"

class ComponentType(Enum):
    FRONTEND = "frontend"
    BACKEND = "backend"
    DATABASE = "database"
    AUTH = "auth"
    ANALYTICS = "analytics"
    WORKFLOW = "workflow"

@dataclass
class DebugContext:
    """Debug session context and metadata"""
    session_id: str
    timestamp: datetime
    issue_description: str
    component: Optional[ComponentType]
    severity: Severity
    files_analyzed: List[str]
    findings: List[str]
    recommendations: List[str]
    reproduction_steps: List[str]

class SystemArchitecture:
    """Kingston's Portal system architecture knowledge base"""
    
    # Core system paths
    BACKEND_PATH = "backend"
    FRONTEND_PATH = "frontend/src"
    DOCS_PATH = "docs"
    
    # Key architectural components
    BACKEND_MODULES = {
        "api_routes": "app/api/routes",
        "models": "app/models", 
        "services": "app/services",
        "database": "app/db",
        "utils": "app/utils",
        "main": "main.py"
    }
    
    FRONTEND_MODULES = {
        "pages": "pages",
        "components": "components",
        "hooks": "hooks", 
        "services": "services",
        "context": "context",
        "utils": "utils"
    }
    
    # Database schema hierarchy
    DATABASE_HIERARCHY = [
        "client_groups",
        "product_owners", 
        "client_products",
        "portfolios",
        "portfolio_funds"
    ]
    
    # Critical performance views
    ANALYTICS_VIEWS = [
        "company_irr_cache",
        "analytics_dashboard_summary",
        "portfolio_irr_values",
        "portfolio_fund_irr_values"
    ]
    
    # Authentication flow components
    AUTH_COMPONENTS = {
        "backend": ["app/utils/security.py", "app/api/routes/auth.py"],
        "frontend": ["context/AuthContext.tsx", "components/auth/"],
        "middleware": ["main.py"]  # CORS and cookie config
    }

class KingstonDebugAgent:
    """Main debugging agent with specialized knowledge of Kingston's Portal"""
    
    def __init__(self):
        self.architecture = SystemArchitecture()
        self.project_root = Path.cwd()
        self.debug_sessions: List[DebugContext] = []
        self.current_session: Optional[DebugContext] = None
        
    def create_debug_session(self, issue: str, component: Optional[ComponentType] = None, 
                           severity: Severity = Severity.MEDIUM) -> DebugContext:
        """Create a new debugging session with context"""
        session_id = f"debug_{datetime.now().strftime('%Y%m%d_%H%M%S')}"
        
        session = DebugContext(
            session_id=session_id,
            timestamp=datetime.now(),
            issue_description=issue,
            component=component,
            severity=severity,
            files_analyzed=[],
            findings=[],
            recommendations=[],
            reproduction_steps=[]
        )
        
        self.debug_sessions.append(session)
        self.current_session = session
        return session
    
    def analyze_full_stack_issue(self, issue_description: str) -> Dict[str, Any]:
        """Comprehensive full-stack issue analysis following SPARC methodology"""
        
        print(f"\n🔍 KINGSTON'S PORTAL DEBUGGING AGENT")
        print(f"=" * 60)
        print(f"Issue: {issue_description}")
        print(f"Timestamp: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
        print(f"=" * 60)
        
        # SPECIFICATION: Define the problem scope
        analysis = {
            "issue": issue_description,
            "scope_analysis": self._analyze_issue_scope(issue_description),
            "affected_components": [],
            "investigation_plan": [],
            "findings": [],
            "recommendations": []
        }
        
        # PSEUDOCODE: Plan investigation approach
        investigation_steps = self._create_investigation_plan(issue_description)
        analysis["investigation_plan"] = investigation_steps
        
        print(f"\n📋 INVESTIGATION PLAN")
        print("-" * 30)
        for i, step in enumerate(investigation_steps, 1):
            print(f"{i}. {step}")
        
        # ARCHITECTURE: Identify affected system components
        affected_components = self._identify_affected_components(issue_description)
        analysis["affected_components"] = affected_components
        
        print(f"\n🏗️  AFFECTED COMPONENTS")
        print("-" * 30)
        for component in affected_components:
            print(f"• {component}")
        
        # REFINEMENT: Execute detailed analysis
        findings = self._execute_investigation(issue_description, affected_components)
        analysis["findings"] = findings
        
        print(f"\n🔬 INVESTIGATION FINDINGS")
        print("-" * 30)
        for finding in findings:
            print(f"• {finding}")
        
        # COMPLETION: Provide actionable recommendations
        recommendations = self._generate_recommendations(findings, affected_components)
        analysis["recommendations"] = recommendations
        
        print(f"\n💡 RECOMMENDATIONS")
        print("-" * 30)
        for i, rec in enumerate(recommendations, 1):
            print(f"{i}. {rec}")
        
        return analysis
    
    def _analyze_issue_scope(self, issue: str) -> Dict[str, bool]:
        """Determine which system layers are likely affected"""
        issue_lower = issue.lower()
        
        return {
            "frontend_ui": any(term in issue_lower for term in 
                             ["ui", "component", "render", "display", "form", "button", "page"]),
            "frontend_state": any(term in issue_lower for term in 
                                ["state", "query", "cache", "hook", "context"]),
            "api_endpoint": any(term in issue_lower for term in 
                              ["api", "endpoint", "request", "response", "route"]),
            "authentication": any(term in issue_lower for term in 
                                ["auth", "login", "token", "cookie", "jwt", "permission"]),
            "database": any(term in issue_lower for term in 
                          ["database", "query", "table", "view", "sql", "data"]),
            "performance": any(term in issue_lower for term in 
                             ["slow", "performance", "cache", "analytics", "load"]),
            "financial_logic": any(term in issue_lower for term in 
                                 ["irr", "portfolio", "fund", "valuation", "calculation"]),
            "workflow": any(term in issue_lower for term in 
                          ["workflow", "process", "cascade", "sync", "create", "update"])
        }
    
    def _create_investigation_plan(self, issue: str) -> List[str]:
        """Create systematic investigation steps based on issue type"""
        scope = self._analyze_issue_scope(issue)
        steps = []
        
        # Always start with system status
        steps.append("Check system status (backend/frontend running, database connectivity)")
        
        if scope["authentication"]:
            steps.extend([
                "Verify authentication flow (httpOnly cookies, JWT tokens)",
                "Check CORS configuration and cookie settings",
                "Test auth endpoints and middleware"
            ])
        
        if scope["database"]:
            steps.extend([
                "Verify database schema and migrations",
                "Check data integrity and foreign key constraints",
                "Analyze query performance and view status"
            ])
        
        if scope["api_endpoint"]:
            steps.extend([
                "Test API endpoints with proper authentication",
                "Validate Pydantic model schemas",
                "Check error handling and response formats"
            ])
        
        if scope["frontend_ui"] or scope["frontend_state"]:
            steps.extend([
                "Inspect component hierarchy and props flow",
                "Check React Query cache and state management",
                "Verify routing and navigation logic"
            ])
        
        if scope["performance"]:
            steps.extend([
                "Analyze analytics views and cache status",
                "Check database query performance",
                "Profile React Query and component rendering"
            ])
        
        if scope["financial_logic"]:
            steps.extend([
                "Verify IRR calculation accuracy",
                "Check portfolio fund relationships",
                "Validate activity log entries"
            ])
        
        # Always end with reproduction steps
        steps.append("Create reproduction steps and test solution")
        
        return steps
    
    def _identify_affected_components(self, issue: str) -> List[str]:
        """Identify specific files/components that may be affected"""
        components = []
        issue_lower = issue.lower()
        
        # Authentication components
        if any(term in issue_lower for term in ["auth", "login", "token", "cookie"]):
            components.extend([
                "backend/main.py (CORS/cookie config)",
                "backend/app/utils/security.py",
                "backend/app/api/routes/auth.py",
                "frontend/src/context/AuthContext.tsx",
                "frontend/src/components/auth/"
            ])
        
        # Database components
        if any(term in issue_lower for term in ["database", "data", "sql", "query"]):
            components.extend([
                "backend/app/db/database.py",
                "backend/check_schema.py",
                "database.sql"
            ])
        
        # Analytics components
        if any(term in issue_lower for term in ["analytics", "performance", "dashboard"]):
            components.extend([
                "backend/app/api/routes/analytics.py",
                "frontend/src/pages/Dashboard.tsx",
                "Database views: company_irr_cache, analytics_dashboard_summary"
            ])
        
        # Portfolio/Fund components
        if any(term in issue_lower for term in ["portfolio", "fund", "irr"]):
            components.extend([
                "backend/app/api/routes/portfolios.py",
                "backend/app/api/routes/funds.py",
                "backend/app/services/irr_calculation.py",
                "frontend/src/pages/PortfolioManagement.tsx",
                "frontend/src/services/irrCalculationService.ts"
            ])
        
        # Report components
        if any(term in issue_lower for term in ["report", "generate", "print"]):
            components.extend([
                "backend/app/api/routes/reports.py",
                "frontend/src/pages/ReportGenerator.tsx",
                "frontend/src/services/reportService.ts",
                "frontend/src/components/report/"
            ])
        
        return components
    
    def _execute_investigation(self, issue: str, components: List[str]) -> List[str]:
        """Execute detailed investigation of identified components"""
        findings = []
        
        # Check if critical files exist
        missing_files = []
        for component in components:
            if "/" in component and not component.startswith("Database"):
                file_path = self.project_root / component.replace("backend/", "").replace("frontend/src/", "frontend/src/")
                if not file_path.exists() and not file_path.with_suffix("").exists():
                    # Check without extension too
                    base_path = str(file_path).split(" (")[0]  # Remove parenthetical info
                    if not Path(base_path).exists():
                        missing_files.append(component)
        
        if missing_files:
            findings.append(f"CRITICAL: Missing files detected: {', '.join(missing_files)}")
        
        # Check git status for uncommitted changes
        try:
            result = subprocess.run(["git", "status", "--porcelain"], 
                                  capture_output=True, text=True, cwd=self.project_root)
            if result.returncode == 0 and result.stdout.strip():
                findings.append(f"Uncommitted changes detected: {result.stdout.strip()}")
        except:
            findings.append("Could not check git status")
        
        # Check if backend/frontend processes might be running
        findings.append("Recommended: Verify backend (port 8001) and frontend (port 3000) are running")
        
        # Check for common configuration issues
        env_file = self.project_root / "backend" / ".env"
        if not env_file.exists():
            findings.append("CRITICAL: Backend .env file missing")
        
        # Check package files
        package_json = self.project_root / "frontend" / "package.json"
        requirements_txt = self.project_root / "backend" / "requirements.txt"
        
        if not package_json.exists():
            findings.append("CRITICAL: Frontend package.json missing")
        if not requirements_txt.exists():
            findings.append("CRITICAL: Backend requirements.txt missing")
        
        return findings
    
    def _generate_recommendations(self, findings: List[str], components: List[str]) -> List[str]:
        """Generate actionable recommendations based on findings"""
        recommendations = []
        
        # Critical issue recommendations
        if any("CRITICAL" in finding for finding in findings):
            recommendations.append("🚨 IMMEDIATE ACTION: Address critical issues first")
            
            if any("missing" in finding.lower() for finding in findings):
                recommendations.append("Verify project structure and restore missing files")
                recommendations.append("Check git history for accidentally deleted files")
        
        # Authentication recommendations
        if any("auth" in comp.lower() for comp in components):
            recommendations.extend([
                "Test authentication flow: login → token validation → API access",
                "Verify httpOnly cookie settings in main.py CORS configuration",
                "Check JWT token expiration and refresh logic"
            ])
        
        # Database recommendations
        if any("database" in comp.lower() for comp in components):
            recommendations.extend([
                "Run: python backend/check_schema.py to verify database connectivity",
                "Check DATABASE_URL in backend/.env file",
                "Verify PostgreSQL service is running"
            ])
        
        # Performance recommendations
        if any("analytics" in comp.lower() for comp in components):
            recommendations.extend([
                "Check analytics cache status: GET /api/analytics/company/irr/refresh-background",
                "Verify pre-computed views are populated",
                "Monitor database query performance"
            ])
        
        # Development workflow recommendations
        recommendations.extend([
            "Follow SPARC methodology: Specification → Pseudocode → Architecture → Refinement → Completion",
            "Use London School TDD: Write failing test → Implement solution → Refactor",
            "Commit changes with detailed messages using 'finish commit' workflow"
        ])
        
        # General debugging recommendations
        recommendations.extend([
            "Enable DEBUG=true in backend/.env for detailed error logging",
            "Use browser DevTools Network tab to monitor API requests",
            "Check backend logs for detailed error messages",
            "Test with minimal reproduction case to isolate the issue"
        ])
        
        return recommendations
    
    def debug_authentication_flow(self) -> Dict[str, Any]:
        """Specialized debugging for authentication issues"""
        print(f"\n🔐 AUTHENTICATION FLOW DEBUGGING")
        print("=" * 50)
        
        auth_analysis = {
            "cookie_config": self._check_cookie_configuration(),
            "jwt_validation": self._check_jwt_setup(),
            "cors_settings": self._check_cors_configuration(),
            "auth_endpoints": self._check_auth_endpoints(),
            "frontend_context": self._check_auth_context()
        }
        
        for category, results in auth_analysis.items():
            print(f"\n{category.upper()}:")
            for item in results:
                print(f"  • {item}")
        
        return auth_analysis
    
    def debug_database_connectivity(self) -> Dict[str, Any]:
        """Specialized debugging for database issues"""
        print(f"\n🗄️  DATABASE CONNECTIVITY DEBUGGING")
        print("=" * 50)
        
        db_analysis = {
            "connection_string": self._check_database_url(),
            "schema_status": self._check_schema_files(),
            "migration_status": self._check_migrations(),
            "view_status": self._check_analytics_views()
        }
        
        for category, results in db_analysis.items():
            print(f"\n{category.upper()}:")
            for item in results:
                print(f"  • {item}")
        
        return db_analysis
    
    def debug_performance_analytics(self) -> Dict[str, Any]:
        """Specialized debugging for performance and analytics issues"""
        print(f"\n⚡ PERFORMANCE & ANALYTICS DEBUGGING")  
        print("=" * 50)
        
        perf_analysis = {
            "analytics_endpoints": self._check_analytics_endpoints(),
            "cache_status": self._check_cache_configuration(),
            "query_optimization": self._check_query_patterns(),
            "frontend_optimization": self._check_react_query_setup()
        }
        
        for category, results in perf_analysis.items():
            print(f"\n{category.upper()}:")
            for item in results:
                print(f"  • {item}")
        
        return perf_analysis
    
    # Helper methods for specific checks
    def _check_cookie_configuration(self) -> List[str]:
        results = []
        main_py = self.project_root / "backend" / "main.py"
        
        if main_py.exists():
            try:
                content = main_py.read_text()
                if "httponly=True" in content.lower():
                    results.append("✅ HttpOnly cookie setting found")
                else:
                    results.append("❌ HttpOnly cookie setting not configured")
                    
                if "samesite=" in content.lower():
                    results.append("✅ SameSite cookie setting found")
                else:
                    results.append("❌ SameSite cookie setting missing")
            except Exception as e:
                results.append(f"❌ Error reading main.py: {e}")
        else:
            results.append("❌ Backend main.py file not found")
        
        return results
    
    def _check_jwt_setup(self) -> List[str]:
        results = []
        env_file = self.project_root / "backend" / ".env"
        
        if env_file.exists():
            try:
                content = env_file.read_text()
                if "JWT_SECRET=" in content:
                    results.append("✅ JWT_SECRET configured")
                else:
                    results.append("❌ JWT_SECRET missing from .env")
                    
                if "ACCESS_TOKEN_EXPIRE_MINUTES=" in content:
                    results.append("✅ Token expiration configured")
                else:
                    results.append("❌ ACCESS_TOKEN_EXPIRE_MINUTES missing")
            except Exception as e:
                results.append(f"❌ Error reading .env: {e}")
        else:
            results.append("❌ Backend .env file not found")
        
        return results
    
    def _check_cors_configuration(self) -> List[str]:
        results = []
        main_py = self.project_root / "backend" / "main.py" 
        
        if main_py.exists():
            try:
                content = main_py.read_text()
                if "CORSMiddleware" in content:
                    results.append("✅ CORS middleware configured")
                else:
                    results.append("❌ CORS middleware not found")
                    
                if "allow_credentials=True" in content:
                    results.append("✅ CORS credentials enabled")
                else:
                    results.append("❌ CORS credentials not enabled")
            except Exception as e:
                results.append(f"❌ Error analyzing CORS config: {e}")
        else:
            results.append("❌ Backend main.py not found")
            
        return results
    
    def _check_auth_endpoints(self) -> List[str]:
        results = []
        auth_route = self.project_root / "backend" / "app" / "api" / "routes" / "auth.py"
        
        if auth_route.exists():
            results.append("✅ Auth routes file found")
        else:
            results.append("❌ Auth routes file missing")
            
        return results
    
    def _check_auth_context(self) -> List[str]:
        results = []
        auth_context = self.project_root / "frontend" / "src" / "context" / "AuthContext.tsx"
        
        if auth_context.exists():
            results.append("✅ Frontend AuthContext found")
        else:
            results.append("❌ Frontend AuthContext missing")
            
        return results
    
    def _check_database_url(self) -> List[str]:
        results = []
        env_file = self.project_root / "backend" / ".env"
        
        if env_file.exists():
            try:
                content = env_file.read_text()
                if "DATABASE_URL=" in content:
                    results.append("✅ DATABASE_URL configured")
                else:
                    results.append("❌ DATABASE_URL missing from .env")
            except Exception as e:
                results.append(f"❌ Error reading .env: {e}")
        else:
            results.append("❌ Backend .env file not found")
            
        return results
    
    def _check_schema_files(self) -> List[str]:
        results = []
        schema_file = self.project_root / "database.sql"
        check_schema = self.project_root / "backend" / "check_schema.py"
        
        if schema_file.exists():
            results.append("✅ Database schema file found")
        else:
            results.append("❌ database.sql file missing")
            
        if check_schema.exists():
            results.append("✅ Schema validation script found")
        else:
            results.append("❌ check_schema.py script missing")
            
        return results
    
    def _check_migrations(self) -> List[str]:
        results = []
        migration_dir = self.project_root / "migration_scripts"
        
        if migration_dir.exists():
            migration_files = list(migration_dir.glob("*.sql"))
            results.append(f"✅ Migration directory found with {len(migration_files)} scripts")
        else:
            results.append("⚠️  No migration_scripts directory found")
            
        return results
    
    def _check_analytics_views(self) -> List[str]:
        results = []
        # This would need database connection to actually verify
        results.append("📝 Recommend running: python backend/check_schema.py to verify views")
        results.append("📝 Key views to check: company_irr_cache, analytics_dashboard_summary")
        return results
    
    def _check_analytics_endpoints(self) -> List[str]:
        results = []
        analytics_route = self.project_root / "backend" / "app" / "api" / "routes" / "analytics.py"
        
        if analytics_route.exists():
            results.append("✅ Analytics routes file found")
        else:
            results.append("❌ Analytics routes file missing")
            
        return results
    
    def _check_cache_configuration(self) -> List[str]:
        results = []
        results.append("📝 Check React Query cache settings in App.tsx")
        results.append("📝 Verify database view refresh schedules")
        results.append("📝 Monitor cache hit rates for analytics endpoints")
        return results
    
    def _check_query_patterns(self) -> List[str]:
        results = []
        results.append("📝 Review bulk data endpoints for optimization")
        results.append("📝 Check for N+1 query patterns in related data")
        results.append("📝 Verify database indexes on frequently queried columns")
        return results
    
    def _check_react_query_setup(self) -> List[str]:
        results = []
        app_file = self.project_root / "frontend" / "src" / "App.tsx"
        
        if app_file.exists():
            try:
                content = app_file.read_text()
                if "QueryClient" in content:
                    results.append("✅ React Query configured")
                else:
                    results.append("❌ React Query setup not found")
            except Exception as e:
                results.append(f"❌ Error reading App.tsx: {e}")
        else:
            results.append("❌ Frontend App.tsx not found")
            
        return results
    
    def interactive_debugging_session(self):
        """Interactive debugging session with specialized prompts"""
        print(f"\n🤖 KINGSTON'S PORTAL INTERACTIVE DEBUGGING")
        print("=" * 60)
        print("Welcome to the specialized debugging agent for Kingston's Portal!")
        print("Type 'help' for available commands or 'exit' to quit.")
        print("=" * 60)
        
        while True:
            try:
                user_input = input("\n🔍 Debug> ").strip()
                
                if user_input.lower() in ['exit', 'quit', 'q']:
                    print("👋 Debugging session ended.")
                    break
                    
                elif user_input.lower() == 'help':
                    self._show_help()
                    
                elif user_input.lower().startswith('analyze '):
                    issue = user_input[8:]  # Remove 'analyze '
                    self.analyze_full_stack_issue(issue)
                    
                elif user_input.lower() == 'auth':
                    self.debug_authentication_flow()
                    
                elif user_input.lower() == 'database':
                    self.debug_database_connectivity()
                    
                elif user_input.lower() == 'performance':
                    self.debug_performance_analytics()
                    
                elif user_input.lower() == 'status':
                    self._show_system_status()
                    
                elif user_input.lower() == 'architecture':
                    self._show_architecture_overview()
                    
                else:
                    print(f"Unknown command: {user_input}")
                    print("Type 'help' for available commands.")
                    
            except KeyboardInterrupt:
                print("\n\n👋 Debugging session ended.")
                break
            except Exception as e:
                print(f"❌ Error: {e}")
    
    def _show_help(self):
        """Show available interactive commands"""
        help_text = """
🛠️  AVAILABLE DEBUGGING COMMANDS

General Analysis:
  analyze <issue>     - Full-stack analysis of described issue
  status             - Show current system status
  architecture       - Display system architecture overview

Specialized Debugging:
  auth              - Debug authentication flow issues
  database          - Debug database connectivity issues  
  performance       - Debug performance and analytics issues

Navigation:
  help              - Show this help message
  exit              - End debugging session

Examples:
  analyze Login form not submitting data
  analyze Portfolio creation workflow failing
  analyze Analytics dashboard loading slowly
  auth
  database
        """
        print(help_text)
    
    def _show_system_status(self):
        """Display current system status"""
        print(f"\n📊 SYSTEM STATUS")
        print("-" * 30)
        
        # Check project structure
        backend_exists = (self.project_root / "backend").exists()
        frontend_exists = (self.project_root / "frontend").exists()
        
        print(f"Backend directory: {'✅' if backend_exists else '❌'}")
        print(f"Frontend directory: {'✅' if frontend_exists else '❌'}")
        
        # Check key files
        key_files = [
            ("backend/.env", "Backend configuration"),
            ("backend/main.py", "FastAPI application"),
            ("frontend/src/App.tsx", "React application"),
            ("database.sql", "Database schema"),
            ("package.json", "Project metadata")
        ]
        
        for file_path, description in key_files:
            exists = (self.project_root / file_path).exists()
            print(f"{description}: {'✅' if exists else '❌'}")
    
    def _show_architecture_overview(self):
        """Display system architecture overview"""
        print(f"\n🏗️  KINGSTON'S PORTAL ARCHITECTURE")
        print("=" * 50)
        
        print(f"\n📚 5-LEVEL HIERARCHY:")
        for i, level in enumerate(self.architecture.DATABASE_HIERARCHY, 1):
            print(f"  {i}. {level}")
        
        print(f"\n🚀 BACKEND (FastAPI + PostgreSQL):")
        for name, path in self.architecture.BACKEND_MODULES.items():
            print(f"  • {name}: {path}")
        
        print(f"\n⚛️  FRONTEND (React + TypeScript):")
        for name, path in self.architecture.FRONTEND_MODULES.items():
            print(f"  • {name}: {path}")
        
        print(f"\n⚡ ANALYTICS VIEWS:")
        for view in self.architecture.ANALYTICS_VIEWS:
            print(f"  • {view}")
    
    def generate_debug_report(self, session: DebugContext) -> str:
        """Generate comprehensive debug report"""
        report = f"""
KINGSTON'S PORTAL DEBUGGING REPORT
{'=' * 50}

Session ID: {session.session_id}
Timestamp: {session.timestamp.strftime('%Y-%m-%d %H:%M:%S')}
Issue: {session.issue_description}
Component: {session.component.value if session.component else 'N/A'}
Severity: {session.severity.value}

ANALYSIS SUMMARY
{'-' * 20}
Files Analyzed: {len(session.files_analyzed)}
{chr(10).join(f'  • {file}' for file in session.files_analyzed)}

FINDINGS
{'-' * 20}
{chr(10).join(f'  • {finding}' for finding in session.findings)}

RECOMMENDATIONS  
{'-' * 20}
{chr(10).join(f'  {i+1}. {rec}' for i, rec in enumerate(session.recommendations))}

REPRODUCTION STEPS
{'-' * 20}
{chr(10).join(f'  {i+1}. {step}' for i, step in enumerate(session.reproduction_steps))}

NEXT ACTIONS
{'-' * 20}
1. Address critical issues first (marked with 🚨)
2. Follow SPARC methodology for implementation
3. Test solution with minimal reproduction case
4. Update documentation if architectural changes made

Generated by Kingston's Portal Debugging Agent
        """
        
        return report

def main():
    """Main entry point with command line interface"""
    parser = argparse.ArgumentParser(
        description="Kingston's Portal System Debugging Agent",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  python debugging_agent.py --interactive
  python debugging_agent.py --issue "Login form not working" --component auth --severity high
  python debugging_agent.py --performance --analytics
  python debugging_agent.py --auth --cookies
        """
    )
    
    parser.add_argument('--issue', help='Describe the issue to debug')
    parser.add_argument('--component', choices=['frontend', 'backend', 'database', 'auth', 'analytics', 'workflow'],
                       help='Primary component affected')
    parser.add_argument('--severity', choices=['critical', 'high', 'medium', 'low'], 
                       default='medium', help='Issue severity level')
    parser.add_argument('--interactive', action='store_true', 
                       help='Start interactive debugging session')
    parser.add_argument('--auth', action='store_true', 
                       help='Debug authentication issues')
    parser.add_argument('--database', action='store_true',
                       help='Debug database connectivity')  
    parser.add_argument('--performance', action='store_true',
                       help='Debug performance and analytics')
    parser.add_argument('--workflow', help='Debug specific workflow')
    
    args = parser.parse_args()
    
    agent = KingstonDebugAgent()
    
    try:
        if args.interactive:
            agent.interactive_debugging_session()
        elif args.auth:
            agent.debug_authentication_flow()
        elif args.database:
            agent.debug_database_connectivity()
        elif args.performance:
            agent.debug_performance_analytics()
        elif args.issue:
            component = ComponentType(args.component) if args.component else None
            severity = Severity(args.severity)
            
            session = agent.create_debug_session(args.issue, component, severity)
            analysis = agent.analyze_full_stack_issue(args.issue)
            
            # Generate and save report
            report = agent.generate_debug_report(session)
            report_file = f"debug_report_{session.session_id}.txt"
            
            with open(report_file, 'w') as f:
                f.write(report)
            
            print(f"\n📄 Debug report saved to: {report_file}")
        else:
            parser.print_help()
            
    except Exception as e:
        print(f"❌ Debugging agent error: {e}")
        sys.exit(1)

if __name__ == "__main__":
    main()