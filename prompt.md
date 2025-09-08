(venv) PS C:\Users\kingstonadmin\Documents\kingstons_portal> ./setup_server_backups.ps1
At C:\Users\kingstonadmin\Documents\kingstons_portal\setup_server_backups.ps
1:93 char:17
+     Write-Host "  âœ— .env file not found!" -ForegroundColor Red
+                 ~
Missing ']' after array index expression.
At C:\Users\kingstonadmin\Documents\kingstons_portal\setup_server_backups.ps
1:105 char:23
+         Write-Host "  âœ“ Database connection successful" -Foreground ...
+                       ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
Unexpected token 'âœ“ Database connection successful"' in expression or
statement.
At C:\Users\kingstonadmin\Documents\kingstons_portal\setup_server_backups.ps
1:106 char:6
+     } else {
+      ~
The Try statement is missing its Catch or Finally block.
At C:\Users\kingstonadmin\Documents\kingstons_portal\setup_server_backups.ps
1:110 char:1
+ } catch {
+ ~
Unexpected token '}' in expression or statement.
At C:\Users\kingstonadmin\Documents\kingstons_portal\setup_server_backups.ps
1:148 char:47
+ Write-Host "  â€¢ Weekly backups: 4 weeks (28 days)" -ForegroundColor ...
+                                               ~~~~
Unexpected token 'days' in expression or statement.
At C:\Users\kingstonadmin\Documents\kingstons_portal\setup_server_backups.ps
1:148 char:46
+ Write-Host "  â€¢ Weekly backups: 4 weeks (28 days)" -ForegroundColor ...
+                                              ~
Missing closing ')' in expression.
At C:\Users\kingstonadmin\Documents\kingstons_portal\setup_server_backups.ps
1:123 char:5
+ try {
+     ~
Missing closing '}' in statement block or type definition.
At C:\Users\kingstonadmin\Documents\kingstons_portal\setup_server_backups.ps
1:148 char:51
+ Write-Host "  â€¢ Weekly backups: 4 weeks (28 days)" -ForegroundColor ...
+                                                   ~
The Try statement is missing its Catch or Finally block.
At C:\Users\kingstonadmin\Documents\kingstons_portal\setup_server_backups.ps
1:148 char:51
+ Write-Host "  â€¢ Weekly backups: 4 weeks (28 days)" -ForegroundColor ...
+                                                   ~
Unexpected token ')' in expression or statement.
At C:\Users\kingstonadmin\Documents\kingstons_portal\setup_server_backups.ps
1:149 char:15
+ Write-Host "  â€¢ Monthly backups: 12 months" -ForegroundColor White
+               ~~~
Unexpected token 'â€¢' in expression or statement.
Not all parse errors were reported.  Correct the reported errors and try
again.
    + CategoryInfo          : ParserError: (:) [], ParseException
    + FullyQualifiedErrorId : MissingEndSquareBracket